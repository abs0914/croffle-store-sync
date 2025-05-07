
import { supabase } from "@/integrations/supabase/client";
import { Product, ProductVariation } from "@/types";
import { toast } from "sonner";
import { updateInventory } from "./inventoryService";

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
