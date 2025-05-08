
import { supabase } from "@/integrations/supabase/client";

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
      // If category_id is specified, check if it exists by name and store_id
      if (product.category_id) {
        const categoryName = product.category_id.replace(/"/g, ''); // Remove quotes if present
        const { data: categoryData } = await supabase
          .from('categories')
          .select('id')
          .eq('name', categoryName)
          .eq('store_id', storeId)
          .maybeSingle();
          
        if (categoryData) {
          // Use the actual category ID from the database
          product.category_id = categoryData.id;
        } else {
          // If category doesn't exist, remove the category_id to use default
          delete product.category_id;
        }
      }
      
      // First check if the product already exists by SKU
      const { data: existingProduct } = await supabase
        .from('products')
        .select('id, stock_quantity')
        .eq('sku', product.sku)
        .eq('store_id', storeId)
        .single();
      
      if (existingProduct) {
        await processExistingProduct(existingProduct, product, storeId);
      } else if (product.name && product.sku) {
        await createNewProduct(product, storeId);
      }
    } catch (error) {
      console.error("Error processing product import:", error);
    }
  }
  
  return products;
};

// Helper function for processing existing products
const processExistingProduct = async (existingProduct: any, product: any, storeId: string) => {
  // Update existing product stock
  const newQuantity = existingProduct.stock_quantity + (product.stock_quantity || 0);
  await supabase
    .from('products')
    .update({ 
      stock_quantity: newQuantity,
      updated_at: new Date().toISOString(),
      category_id: product.category_id || undefined // Update category if provided
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
    await createProductVariations(existingProduct.id, product, storeId);
  }
};

// Helper function for creating new products
const createNewProduct = async (product: any, storeId: string) => {
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
      store_id: storeId,
      category_id: product.category_id || null // Add category_id if provided
    })
    .select()
    .single();
    
  if (error) {
    console.error("Error creating product:", error);
    return;
  }
  
  if (!newProduct) return;
  
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
    await createProductVariations(newProduct.id, product, storeId);
  }
};

// Helper function for creating product variations
const createProductVariations = async (productId: string, product: any, storeId: string) => {
  const stockPerVariation = Math.floor(product.stock_quantity / 3);
  
  // Create regular size variation
  const regularSku = `${product.sku}-REG`;
  await supabase
    .from('product_variations')
    .upsert({
      name: `${product.name} Regular`,
      sku: regularSku,
      price: product.regular_price || 0,
      stock_quantity: stockPerVariation,
      is_active: product.is_active,
      product_id: productId,
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
      stock_quantity: stockPerVariation,
      is_active: product.is_active,
      product_id: productId,
      size: 'mini'
    });
    
  // Create croffle overload variation
  const overloadSku = `${product.sku}-OVR`;
  await supabase
    .from('product_variations')
    .upsert({
      name: `${product.name} Croffle Overload`,
      sku: overloadSku,
      price: product.overload_price || (product.regular_price * 1.3) || 0,
      stock_quantity: stockPerVariation,
      is_active: product.is_active,
      product_id: productId,
      size: 'croffle-overload'
    });
};
