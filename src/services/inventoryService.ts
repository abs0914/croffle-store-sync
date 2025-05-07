import { supabase } from "@/integrations/supabase/client";
import { Product, ProductVariation, Category, Store } from "@/types";
import { toast } from "sonner";

// Fetch products with optional store filter
export async function fetchProducts(storeId?: string) {
  try {
    let query = supabase.from('products').select(`
      *,
      category_id,
      store_id
    `);

    if (storeId) {
      query = query.eq('store_id', storeId);
    }

    const { data, error } = await query.order('name');
    
    if (error) throw error;
    
    // Map to our Product type
    const products: Product[] = data.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description || "",
      price: Number(item.price),
      categoryId: item.category_id || "",
      storeId: item.store_id,
      image: item.image,
      isActive: item.is_active,
      sku: item.sku || "",
      barcode: item.barcode || undefined,
      cost: item.cost ? Number(item.cost) : undefined,
      stockQuantity: 0, // Will be populated from inventory data separately
    }));
    
    return products;
  } catch (error) {
    console.error('Error fetching products:', error);
    throw error;
  }
}

// Fetch a single product by ID
export async function fetchProductById(productId: string) {
  try {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        category_id,
        store_id
      `)
      .eq('id', productId)
      .single();
      
    if (error) throw error;
    
    if (!data) {
      throw new Error('Product not found');
    }
    
    const product: Product = {
      id: data.id,
      name: data.name,
      description: data.description || "",
      price: Number(data.price),
      categoryId: data.category_id || "",
      storeId: data.store_id,
      image: data.image,
      isActive: data.is_active,
      sku: data.sku || "",
      barcode: data.barcode || undefined,
      cost: data.cost ? Number(data.cost) : undefined,
      stockQuantity: 0, // Will be populated from inventory data separately
    };
    
    // Fetch variations for this product
    const { data: variationsData, error: variationsError } = await supabase
      .from('product_variations')
      .select('*')
      .eq('product_id', productId);
      
    if (variationsError) {
      console.error('Error fetching variations:', variationsError);
    } else if (variationsData) {
      product.variations = variationsData.map((v) => ({
        id: v.id,
        name: v.name,
        price: Number(v.price),
        isActive: v.is_active,
        stockQuantity: 0, // Will be populated from inventory data separately
      }));
    }
    
    // Fetch inventory data for this product
    const { data: inventoryData, error: inventoryError } = await supabase
      .from('inventory')
      .select('*')
      .eq('product_id', productId);
      
    if (inventoryError) {
      console.error('Error fetching inventory:', inventoryError);
    } else if (inventoryData) {
      // Set main product stock quantity (where variation_id is null)
      const mainProductInventory = inventoryData.find(i => i.variation_id === null);
      if (mainProductInventory) {
        product.stockQuantity = mainProductInventory.quantity;
      }
      
      // Set variation stock quantities
      if (product.variations) {
        product.variations = product.variations.map(variation => {
          const varInventory = inventoryData.find(i => i.variation_id === variation.id);
          return {
            ...variation,
            stockQuantity: varInventory ? varInventory.quantity : 0
          };
        });
      }
    }
    
    return product;
  } catch (error) {
    console.error('Error fetching product by ID:', error);
    throw error;
  }
}

// Create or update a product
export async function saveProduct(product: Product, storeId: string) {
  try {
    // Prepare product data
    const productData = {
      name: product.name,
      description: product.description,
      price: product.price,
      cost: product.cost,
      category_id: product.categoryId || null,
      image: product.image,
      is_active: product.isActive,
      sku: product.sku,
      barcode: product.barcode,
      store_id: storeId,
    };

    let productId = product.id;
    
    if (productId) {
      // Update existing product
      const { error } = await supabase
        .from('products')
        .update(productData)
        .eq('id', productId);
        
      if (error) throw error;
    } else {
      // Create new product
      const { data, error } = await supabase
        .from('products')
        .insert(productData)
        .select('id')
        .single();
        
      if (error) throw error;
      productId = data.id;
    }
    
    // Handle variations if any
    if (product.variations && product.variations.length > 0) {
      for (const variation of product.variations) {
        const variationData = {
          name: variation.name,
          price: variation.price,
          is_active: variation.isActive,
          product_id: productId,
        };
        
        if (variation.id) {
          // Update existing variation
          await supabase
            .from('product_variations')
            .update(variationData)
            .eq('id', variation.id);
        } else {
          // Create new variation
          await supabase
            .from('product_variations')
            .insert(variationData);
        }
      }
    }
    
    // Update inventory for main product
    await updateInventory({
      productId,
      storeId,
      quantity: product.stockQuantity,
      isInitialSet: true,
    });
    
    // Update inventory for variations
    if (product.variations && product.variations.length > 0) {
      for (const variation of product.variations) {
        await updateInventory({
          productId,
          storeId,
          variationId: variation.id,
          quantity: variation.stockQuantity,
          isInitialSet: true,
        });
      }
    }
    
    return productId;
  } catch (error) {
    console.error('Error saving product:', error);
    throw error;
  }
}

// Update inventory
interface UpdateInventoryParams {
  productId: string;
  storeId: string;
  variationId?: string;
  quantity: number;
  reason?: string;
  reference?: string;
  isInitialSet?: boolean;
}

export async function updateInventory({
  productId,
  storeId,
  variationId,
  quantity,
  reason = 'Manual adjustment',
  reference = '',
  isInitialSet = false,
}: UpdateInventoryParams) {
  try {
    // Check current quantity first
    const { data: currentInventory, error: fetchError } = await supabase
      .from('inventory')
      .select('quantity')
      .eq('product_id', productId)
      .eq('store_id', storeId)
      .eq('variation_id', variationId || null)
      .maybeSingle();

    if (fetchError) throw fetchError;

    let quantityChange: number;
    
    if (isInitialSet) {
      // Set to absolute value
      if (currentInventory) {
        quantityChange = quantity - currentInventory.quantity;
      } else {
        quantityChange = quantity;
      }
    } else {
      // Use the provided quantity as a change amount
      quantityChange = quantity;
    }
    
    // If there's no change, exit early
    if (quantityChange === 0) return;
    
    // Use the update_inventory function
    const { data, error } = await supabase.rpc(
      'update_inventory',
      {
        p_product_id: productId,
        p_variation_id: variationId || null,
        p_store_id: storeId,
        p_quantity_change: quantityChange,
        p_reason: reason,
        p_reference: reference
      }
    );
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error updating inventory:', error);
    throw error;
  }
}

// Fetch inventory history
export async function fetchInventoryTransactions(
  storeId: string, 
  productId?: string,
  limit = 50,
  offset = 0,
) {
  try {
    let query = supabase
      .from('inventory_transactions')
      .select(`
        *,
        products:product_id (name),
        product_variations:variation_id (name)
      `)
      .eq('store_id', storeId);
      
    if (productId) {
      query = query.eq('product_id', productId);
    }
    
    const { data, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
      
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error fetching inventory transactions:', error);
    throw error;
  }
}

// Fetch categories
export async function fetchCategories(storeId: string) {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('store_id', storeId)
      .order('name');
      
    if (error) throw error;
    
    const categories: Category[] = data.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description || undefined,
      image: item.image || undefined,
      isActive: item.is_active,
    }));
    
    return categories;
  } catch (error) {
    console.error('Error fetching categories:', error);
    throw error;
  }
}

// Create or update a category
export async function saveCategory(category: Category, storeId: string) {
  try {
    const categoryData = {
      name: category.name,
      description: category.description || null,
      image: category.image || null,
      is_active: category.isActive,
      store_id: storeId,
    };

    if (category.id) {
      // Update existing category
      const { error } = await supabase
        .from('categories')
        .update(categoryData)
        .eq('id', category.id);
        
      if (error) throw error;
      
      return category.id;
    } else {
      // Create new category
      const { data, error } = await supabase
        .from('categories')
        .insert(categoryData)
        .select('id')
        .single();
        
      if (error) throw error;
      
      return data.id;
    }
  } catch (error) {
    console.error('Error saving category:', error);
    throw error;
  }
}

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
      .eq('variation_id', null);
      
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
      
      // Handle possible null or relationship error gracefully
      if (product.categories && typeof product.categories === 'object' && product.categories !== null) {
        categoryName = product.categories.name || '';
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
