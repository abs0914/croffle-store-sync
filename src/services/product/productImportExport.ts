
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
        } else if (header === 'stock_quantity') {
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
          
        // Check if size variations need to be created
        if (product.has_variations === 'true' && product.name && product.sku) {
          // Create regular size variation
          const regularSku = `${product.sku}-REG`;
          await supabase
            .from('product_variations')
            .upsert({
              name: `${product.name} Regular`,
              sku: regularSku,
              price: product.regular_price || 0,
              stock_quantity: Math.floor(product.stock_quantity / 2),
              is_active: product.is_active,
              product_id: existingProduct.id,
              size: 'regular'
            });
            
          // Create mini size variation
          const miniSku = `${product.sku}-MINI`;
          await supabase
            .from('product_variations')
            .upsert({
              name: `${product.name} Mini`,
              sku: miniSku,
              price: product.mini_price || (product.regular_price * 0.7) || 0,
              stock_quantity: Math.floor(product.stock_quantity / 2),
              is_active: product.is_active,
              product_id: existingProduct.id,
              size: 'mini'
            });
        }
      } else if (product.name && product.sku) {
        // Create new product
        const { data: newProduct, error } = await supabase
          .from('products')
          .insert({
            name: product.name,
            sku: product.sku,
            description: product.description || '',
            price: product.regular_price || 0, // Use regular_price as the price
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
            
          // Check if size variations need to be created
          if (product.has_variations === 'true') {
            // Create regular size variation
            const regularSku = `${product.sku}-REG`;
            await supabase
              .from('product_variations')
              .insert({
                name: `${product.name} Regular`,
                sku: regularSku,
                price: product.regular_price || 0,
                stock_quantity: Math.floor(product.stock_quantity / 2),
                is_active: product.is_active,
                product_id: newProduct.id,
                size: 'regular'
              });
              
            // Create mini size variation
            const miniSku = `${product.sku}-MINI`;
            await supabase
              .from('product_variations')
              .insert({
                name: `${product.name} Mini`,
                sku: miniSku,
                price: product.mini_price || (product.regular_price * 0.7) || 0,
                stock_quantity: Math.floor(product.stock_quantity / 2),
                is_active: product.is_active,
                product_id: newProduct.id,
                size: 'mini'
              });
          }
        }
      }
    } catch (error) {
      console.error("Error processing product import:", error);
    }
  }
  
  return products;
};

export const generateProductsCSV = (products: Product[]): string => {
  const headers = ['name', 'sku', 'description', 'stock_quantity', 'is_active', 'has_variations', 'regular_price', 'mini_price'];
  const csvRows = [headers.join(',')];
  
  products.forEach(product => {
    const regularVariation = product.variations?.find(v => v.size === 'regular');
    const miniVariation = product.variations?.find(v => v.size === 'mini');
    
    const row = [
      `"${product.name.replace(/"/g, '""')}"`,
      `"${product.sku.replace(/"/g, '""')}"`,
      `"${(product.description || '').replace(/"/g, '""')}"`,
      product.stockQuantity || product.stock_quantity,
      product.isActive || product.is_active ? 'true' : 'false',
      product.variations && product.variations.length > 0 ? 'true' : 'false',
      regularVariation ? regularVariation.price : product.price,
      miniVariation ? miniVariation.price : (product.price || 0) * 0.7
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
    'stock_quantity',
    'is_active',
    'has_variations',
    'regular_price',
    'mini_price'
  ];
  
  // Create the CSV string with headers
  const csvContent = headers.join(',');
  
  // Add example rows
  const exampleRow1 = [
    '"Product Without Variations"',
    '"SKU123"',
    '"Product description"',
    '100',
    'true',
    'false',
    '10.99',
    ''
  ].join(',');
  
  const exampleRow2 = [
    '"Product With Size Variations"',
    '"SKU456"',
    '"Product with Regular and Mini sizes"',
    '200',
    'true',
    'true',
    '15.99',
    '11.99'
  ].join(',');
  
  return `${csvContent}\n${exampleRow1}\n${exampleRow2}`;
};
