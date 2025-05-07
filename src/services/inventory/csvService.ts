
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { updateInventory } from "./inventoryService";

// Process CSV import
export async function importProductsFromCSV(file: File, storeId: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const csvText = e.target?.result as string;
        const lines = csvText.trim().split('\n');
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        
        // Validate required headers
        const requiredHeaders = ['name', 'price'];
        const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
        
        if (missingHeaders.length > 0) {
          throw new Error(`Missing required headers: ${missingHeaders.join(', ')}`);
        }
        
        // Process data rows
        const products = [];
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim());
          
          // Skip empty lines
          if (values.length <= 1 && !values[0]) continue;
          
          const product: Record<string, any> = {
            store_id: storeId,
            is_active: true,
          };
          
          // Map CSV columns to product properties
          headers.forEach((header, index) => {
            if (values[index] !== undefined && values[index] !== '') {
              if (header === 'price' || header === 'cost') {
                product[header] = parseFloat(values[index]);
              } else if (header === 'is_active') {
                product[header] = values[index].toLowerCase() === 'true';
              } else {
                product[header] = values[index];
              }
            }
          });
          
          // Handle special columns
          if (product['category']) {
            // Try to find category by name or create new
            const categoryName = product['category'];
            delete product['category'];
            
            const { data: existingCategory } = await supabase
              .from('categories')
              .select('id')
              .eq('name', categoryName)
              .eq('store_id', storeId)
              .maybeSingle();
              
            if (existingCategory) {
              product['category_id'] = existingCategory.id;
            } else {
              const { data: newCategory } = await supabase
                .from('categories')
                .insert({
                  name: categoryName,
                  store_id: storeId,
                  is_active: true
                })
                .select('id')
                .single();
                
              product['category_id'] = newCategory.id;
            }
          }
          
          // Handle stock quantity separately
          const stockQuantity = product['stock'] ? parseInt(product['stock']) : 0;
          delete product['stock'];
          
          products.push({ product, stockQuantity });
        }
        
        // Insert products
        let successCount = 0;
        for (const { product, stockQuantity } of products) {
          try {
            const { data, error } = await supabase
              .from('products')
              .insert(product)
              .select('id')
              .single();
              
            if (error) {
              console.error('Error inserting product:', error);
              continue;
            }
            
            if (stockQuantity > 0) {
              await updateInventory({
                productId: data.id,
                storeId,
                quantity: stockQuantity,
                reason: 'Initial import',
                isInitialSet: true,
              });
            }
            
            successCount++;
          } catch (error) {
            console.error('Error processing product:', error);
            // Continue with next product
          }
        }
        
        resolve(successCount);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Error reading CSV file'));
    };
    
    reader.readAsText(file);
  });
}

// Generate CSV export
export async function exportProductsToCSV(storeId: string): Promise<string> {
  try {
    // Fetch products with inventory
    const { data: products, error } = await supabase
      .from('products')
      .select(`
        *,
        categories(name)
      `)
      .eq('store_id', storeId);
      
    if (error) throw error;
    
    // Fetch inventory data
    const { data: inventory, error: invError } = await supabase
      .from('inventory')
      .select('*')
      .eq('store_id', storeId)
      .is('variation_id', null);
      
    if (invError) throw invError;
    
    // Prepare CSV data
    const headers = [
      'name',
      'description',
      'price',
      'cost',
      'sku',
      'barcode',
      'category',
      'stock',
      'is_active'
    ];
    
    const csvRows = [headers.join(',')];
    
    products.forEach(product => {
      const stockItem = inventory.find(i => i.product_id === product.id);
      let categoryName = '';
      
      // Safely extract category name using type assertion
      const categories = product.categories;
      if (categories && typeof categories === 'object') {
        const categoriesObj = categories as { name?: string };
        categoryName = categoriesObj.name || '';
      }
      
      const row = [
        `"${product.name.replace(/"/g, '""')}"`, // Escape quotes in name
        product.description ? `"${product.description.replace(/"/g, '""')}"` : '',
        product.price,
        product.cost || '',
        product.sku || '',
        product.barcode || '',
        categoryName,
        stockItem?.quantity || 0,
        product.is_active
      ];
      
      csvRows.push(row.join(','));
    });
    
    return csvRows.join('\n');
  } catch (error) {
    console.error('Error exporting products:', error);
    throw error;
  }
}
