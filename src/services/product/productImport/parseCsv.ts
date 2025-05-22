
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
        } else if (header === 'has_variations') {
          // Convert string boolean to actual boolean
          product[header] = values[i].toLowerCase() === 'true';
        } else if (header === 'regular_price' || header === 'mini_price' || header === 'overload_price') {
          // Convert string prices to numbers if they exist
          if (values[i]) {
            product[header] = parseFloat(values[i]);
          }
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
          // If category doesn't exist, create it
          const { data: newCategory } = await supabase
            .from('categories')
            .insert({
              name: categoryName,
              store_id: storeId,
              is_active: true
            })
            .select()
            .single();
            
          if (newCategory) {
            product.category_id = newCategory.id;
          }
        }
      }
      
      // First check if the product already exists by SKU
      const { data: existingProduct } = await supabase
        .from('products')
        .select('id, stock_quantity')
        .eq('sku', product.sku)
        .eq('store_id', storeId)
        .maybeSingle();
      
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
  // Update existing product
  await supabase
    .from('products')
    .update({ 
      stock_quantity: product.stock_quantity || 0,
      updated_at: new Date().toISOString(),
      category_id: product.category_id || undefined, // Update category if provided
      is_active: product.is_active !== undefined ? product.is_active : true,
      price: product.regular_price || undefined
    })
    .eq('id', existingProduct.id);
  
  // Create inventory transaction record
  await supabase
    .from('inventory_transactions')
    .insert({
      product_id: existingProduct.id,
      store_id: storeId,
      transaction_type: 'import',
      quantity: product.stock_quantity - existingProduct.stock_quantity,
      previous_quantity: existingProduct.stock_quantity,
      new_quantity: product.stock_quantity,
      created_by: 'system',
      notes: 'CSV Import'
    });
    
  // Check if size variations need to be created or updated
  if (product.has_variations === true) {
    await createOrUpdateProductVariations(existingProduct.id, product, storeId);
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
  if (product.has_variations === true) {
    await createOrUpdateProductVariations(newProduct.id, product, storeId);
  }
};

// Helper function for creating or updating product variations
const createOrUpdateProductVariations = async (productId: string, product: any, storeId: string) => {
  // Calculate stock distribution if not specifically provided
  const stockPerVariation = Math.floor(product.stock_quantity / 3);
  
  // Get existing variations if any
  const { data: existingVariations } = await supabase
    .from('product_variations')
    .select('id, size, sku')
    .eq('product_id', productId);
  
  // Create/update regular size variation
  const regularSku = `${product.sku}-REG`;
  const existingRegular = existingVariations?.find(v => v.size === 'regular' || v.sku === regularSku);
  
  if (existingRegular) {
    // Update existing variation
    await supabase
      .from('product_variations')
      .update({
        price: product.regular_price || 0,
        stock_quantity: stockPerVariation,
        is_active: product.is_active
      })
      .eq('id', existingRegular.id);
  } else {
    // Create new variation
    await supabase
      .from('product_variations')
      .insert({
        name: `${product.name} Regular`,
        sku: regularSku,
        price: product.regular_price || 0,
        stock_quantity: stockPerVariation,
        is_active: product.is_active,
        product_id: productId,
        size: 'regular'
      });
  }
    
  // Create/update mini size variation if mini_price exists
  if (product.mini_price) {
    const miniSku = `${product.sku}-MINI`;
    const existingMini = existingVariations?.find(v => v.size === 'mini' || v.sku === miniSku);
    
    if (existingMini) {
      // Update existing variation
      await supabase
        .from('product_variations')
        .update({
          price: product.mini_price,
          stock_quantity: stockPerVariation,
          is_active: product.is_active
        })
        .eq('id', existingMini.id);
    } else {
      // Create new variation
      await supabase
        .from('product_variations')
        .insert({
          name: `${product.name} Mini`,
          sku: miniSku,
          price: product.mini_price,
          stock_quantity: stockPerVariation,
          is_active: product.is_active,
          product_id: productId,
          size: 'mini'
        });
    }
  }
    
  // Create/update croffle overload variation if overload_price exists
  if (product.overload_price) {
    const overloadSku = `${product.sku}-OVR`;
    const existingOverload = existingVariations?.find(v => v.size === 'croffle-overload' || v.sku === overloadSku);
    
    if (existingOverload) {
      // Update existing variation
      await supabase
        .from('product_variations')
        .update({
          price: product.overload_price,
          stock_quantity: stockPerVariation,
          is_active: product.is_active
        })
        .eq('id', existingOverload.id);
    } else {
      // Create new variation
      await supabase
        .from('product_variations')
        .insert({
          name: `${product.name} Croffle Overload`,
          sku: overloadSku,
          price: product.overload_price,
          stock_quantity: stockPerVariation,
          is_active: product.is_active,
          product_id: productId,
          size: 'croffle-overload'
        });
    }
  }
};
