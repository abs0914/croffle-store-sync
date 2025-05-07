
import { Product } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// CSV Import/Export
export const parseProductsCSV = async (csvData: string, storeId: string): Promise<any[]> => {
  const lines = csvData.split('\n');
  const headers = lines[0].split(',').map(header => header.trim());
  
  const products = lines.slice(1)
    .filter(line => line.trim())
    .map(line => {
      const values = line.split(',').map(value => value.trim());
      const product: any = {
        store_id: storeId // Add the store_id to each product
      };
      
      headers.forEach((header, i) => {
        if (header === 'is_active') {
          // Convert string boolean to actual boolean
          product[header] = values[i].toLowerCase() === 'true';
        } else if (header === 'price' || header === 'stock_quantity') {
          // Convert string numbers to actual numbers
          product[header] = parseFloat(values[i]);
        } else {
          product[header] = values[i];
        }
      });
      
      return product;
    });
    
  // Process the imported products
  for (const product of products) {
    try {
      // First check if the product already exists by SKU
      const { data: existingProduct } = await supabase
        .from('products')
        .select('id, stock_quantity')
        .eq('sku', product.sku)
        .eq('store_id', storeId)
        .single();
      
      if (existingProduct) {
        // Update existing product stock
        const newQuantity = existingProduct.stock_quantity + (product.stock_quantity || 0);
        await supabase
          .from('products')
          .update({ 
            stock_quantity: newQuantity,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingProduct.id);
        
        // Create inventory transaction record
        await supabase
          .from('inventory_transactions')
          .insert({
            product_id: existingProduct.id,
            store_id: storeId,
            transaction_type: 'purchase',
            quantity: product.stock_quantity,
            previous_quantity: existingProduct.stock_quantity,
            new_quantity: newQuantity,
            created_by: 'system',
            notes: 'CSV Import'
          });
      } else if (product.name && product.sku) {
        // Create new product
        const { data: newProduct, error } = await supabase
          .from('products')
          .insert({
            name: product.name,
            sku: product.sku,
            description: product.description || '',
            price: product.price || 0,
            stock_quantity: product.stock_quantity || 0,
            is_active: product.is_active !== undefined ? product.is_active : true,
            store_id: storeId
          })
          .select()
          .single();
          
        if (error) {
          console.error("Error creating product:", error);
        } else if (newProduct) {
          // Create inventory transaction record for new product
          await supabase
            .from('inventory_transactions')
            .insert({
              product_id: newProduct.id,
              store_id: storeId,
              transaction_type: 'purchase',
              quantity: product.stock_quantity || 0,
              previous_quantity: 0,
              new_quantity: product.stock_quantity || 0,
              created_by: 'system',
              notes: 'Initial stock from CSV import'
            });
        }
      }
    } catch (error) {
      console.error("Error processing product import:", error);
    }
  }
  
  return products;
};

export const generateProductsCSV = (products: Product[]): string => {
  const headers = ['name', 'sku', 'description', 'price', 'stock_quantity', 'is_active'];
  const csvRows = [headers.join(',')];
  
  products.forEach(product => {
    const row = [
      `"${product.name.replace(/"/g, '""')}"`,
      `"${product.sku.replace(/"/g, '""')}"`,
      `"${(product.description || '').replace(/"/g, '""')}"`,
      product.price,
      product.stockQuantity || product.stock_quantity,
      product.isActive || product.is_active ? 'true' : 'false'
    ];
    
    csvRows.push(row.join(','));
  });
  
  return csvRows.join('\n');
};

export const generateProductImportTemplate = (): string => {
  // Define the headers based on the required fields for product import
  const headers = [
    'name',
    'sku',
    'description',
    'price',
    'stock_quantity',
    'is_active'
  ];
  
  // Create the CSV string with headers
  const csvContent = headers.join(',');
  
  // Add an example row
  const exampleRow = [
    '"Product Name"',
    '"SKU123"',
    '"Product description"',
    '10.99',
    '100',
    'true'
  ].join(',');
  
  return `${csvContent}\n${exampleRow}`;
};
