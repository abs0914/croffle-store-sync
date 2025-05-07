
import { supabase } from "@/integrations/supabase/client";
import { Product, ProductVariation } from "@/types";
import { toast } from "sonner";

export const fetchProducts = async (storeId: string): Promise<Product[]> => {
  try {
    const { data, error } = await supabase
      .from("products")
      .select(`
        *,
        categories:category_id(id, name)
      `)
      .eq("store_id", storeId)
      .order("name");
    
    if (error) {
      throw new Error(error.message);
    }
    
    // Map database fields to our TypeScript interface
    return data?.map(item => ({
      id: item.id,
      name: item.name,
      description: item.description || undefined,
      price: item.price,
      category_id: item.category_id || undefined,
      categoryId: item.category_id || undefined,
      image_url: item.image_url || undefined,
      image: item.image_url || undefined,
      is_active: item.is_active !== null ? item.is_active : true,
      isActive: item.is_active !== null ? item.is_active : true,
      store_id: item.store_id,
      storeId: item.store_id,
      sku: item.sku,
      barcode: item.barcode || undefined,
      cost: item.cost || undefined,
      stock_quantity: item.stock_quantity,
      stockQuantity: item.stock_quantity
    })) || [];
  } catch (error) {
    console.error("Error fetching products:", error);
    toast.error("Failed to load products");
    return [];
  }
};

export const fetchProduct = async (id: string): Promise<Product | null> => {
  try {
    const { data, error } = await supabase
      .from("products")
      .select(`
        *,
        categories:category_id(id, name)
      `)
      .eq("id", id)
      .single();
    
    if (error) {
      throw new Error(error.message);
    }
    
    // Map database fields to our TypeScript interface
    return {
      id: data.id,
      name: data.name,
      description: data.description || undefined,
      price: data.price,
      category_id: data.category_id || undefined,
      categoryId: data.category_id || undefined,
      image_url: data.image_url || undefined,
      image: data.image_url || undefined,
      is_active: data.is_active !== null ? data.is_active : true,
      isActive: data.is_active !== null ? data.is_active : true,
      store_id: data.store_id,
      storeId: data.store_id,
      sku: data.sku,
      barcode: data.barcode || undefined,
      cost: data.cost || undefined,
      stock_quantity: data.stock_quantity,
      stockQuantity: data.stock_quantity
    };
  } catch (error) {
    console.error("Error fetching product:", error);
    toast.error("Failed to load product details");
    return null;
  }
};

export const createProduct = async (product: Omit<Product, "id">): Promise<Product | null> => {
  try {
    // Prepare the data for database insertion
    const dbProduct = {
      name: product.name,
      description: product.description || null,
      sku: product.sku,
      barcode: product.barcode || null,
      price: product.price,
      cost: product.cost || null,
      stock_quantity: product.stock_quantity || product.stockQuantity || 0,
      category_id: product.category_id || product.categoryId || null,
      is_active: product.is_active !== undefined ? product.is_active : (product.isActive || true),
      image_url: product.image_url || product.image || null,
      store_id: product.store_id || product.storeId,
    };
    
    const { data, error } = await supabase
      .from("products")
      .insert(dbProduct)
      .select()
      .single();
    
    if (error) {
      throw new Error(error.message);
    }
    
    toast.success("Product created successfully");
    
    // Map the response back to our TypeScript interface
    return {
      id: data.id,
      name: data.name,
      description: data.description || undefined,
      price: data.price,
      category_id: data.category_id || undefined,
      categoryId: data.category_id || undefined,
      image_url: data.image_url || undefined,
      image: data.image_url || undefined,
      is_active: data.is_active !== null ? data.is_active : true,
      isActive: data.is_active !== null ? data.is_active : true,
      store_id: data.store_id,
      storeId: data.store_id,
      sku: data.sku,
      barcode: data.barcode || undefined,
      cost: data.cost || undefined,
      stock_quantity: data.stock_quantity,
      stockQuantity: data.stock_quantity
    };
  } catch (error) {
    console.error("Error creating product:", error);
    toast.error("Failed to create product");
    return null;
  }
};

export const updateProduct = async (id: string, product: Partial<Product>): Promise<Product | null> => {
  try {
    // Prepare the data for database update
    const dbProduct: any = {};
    if (product.name !== undefined) dbProduct.name = product.name;
    if (product.description !== undefined) dbProduct.description = product.description;
    if (product.sku !== undefined) dbProduct.sku = product.sku;
    if (product.barcode !== undefined) dbProduct.barcode = product.barcode;
    if (product.price !== undefined) dbProduct.price = product.price;
    if (product.cost !== undefined) dbProduct.cost = product.cost;
    if (product.stock_quantity !== undefined) dbProduct.stock_quantity = product.stock_quantity;
    else if (product.stockQuantity !== undefined) dbProduct.stock_quantity = product.stockQuantity;
    if (product.category_id !== undefined) dbProduct.category_id = product.category_id;
    else if (product.categoryId !== undefined) dbProduct.category_id = product.categoryId;
    if (product.is_active !== undefined) dbProduct.is_active = product.is_active;
    else if (product.isActive !== undefined) dbProduct.is_active = product.isActive;
    if (product.image_url !== undefined) dbProduct.image_url = product.image_url;
    else if (product.image !== undefined) dbProduct.image_url = product.image;
    
    const { data, error } = await supabase
      .from("products")
      .update(dbProduct)
      .eq("id", id)
      .select()
      .single();
    
    if (error) {
      throw new Error(error.message);
    }
    
    toast.success("Product updated successfully");
    
    // Map the response back to our TypeScript interface
    return {
      id: data.id,
      name: data.name,
      description: data.description || undefined,
      price: data.price,
      category_id: data.category_id || undefined,
      categoryId: data.category_id || undefined,
      image_url: data.image_url || undefined,
      image: data.image_url || undefined,
      is_active: data.is_active !== null ? data.is_active : true,
      isActive: data.is_active !== null ? data.is_active : true,
      store_id: data.store_id,
      storeId: data.store_id,
      sku: data.sku,
      barcode: data.barcode || undefined,
      cost: data.cost || undefined,
      stock_quantity: data.stock_quantity,
      stockQuantity: data.stock_quantity
    };
  } catch (error) {
    console.error("Error updating product:", error);
    toast.error("Failed to update product");
    return null;
  }
};

export const deleteProduct = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", id);
    
    if (error) {
      throw new Error(error.message);
    }
    
    toast.success("Product deleted successfully");
    return true;
  } catch (error) {
    console.error("Error deleting product:", error);
    toast.error("Failed to delete product");
    return false;
  }
};

// Product variations
export const fetchProductVariations = async (productId: string): Promise<ProductVariation[]> => {
  try {
    const { data, error } = await supabase
      .from("product_variations")
      .select("*")
      .eq("product_id", productId)
      .order("name");
    
    if (error) {
      throw new Error(error.message);
    }
    
    // Map database fields to our TypeScript interface
    return data?.map(item => ({
      id: item.id,
      name: item.name,
      price: item.price,
      is_active: item.is_active !== null ? item.is_active : true,
      isActive: item.is_active !== null ? item.is_active : true,
      stock_quantity: item.stock_quantity,
      stockQuantity: item.stock_quantity,
      product_id: item.product_id,
      productId: item.product_id,
      sku: item.sku
    })) || [];
  } catch (error) {
    console.error("Error fetching variations:", error);
    return [];
  }
};

export const createProductVariation = async (variation: Omit<ProductVariation, "id">): Promise<ProductVariation | null> => {
  try {
    // Prepare the data for database insertion
    const dbVariation = {
      name: variation.name,
      price: variation.price,
      stock_quantity: variation.stock_quantity || variation.stockQuantity || 0,
      is_active: variation.is_active !== undefined ? variation.is_active : (variation.isActive || true),
      product_id: variation.product_id || variation.productId,
      sku: variation.sku
    };
    
    const { data, error } = await supabase
      .from("product_variations")
      .insert(dbVariation)
      .select()
      .single();
    
    if (error) {
      throw new Error(error.message);
    }
    
    toast.success("Variation added successfully");
    
    // Map the response back to our TypeScript interface
    return {
      id: data.id,
      name: data.name,
      price: data.price,
      is_active: data.is_active !== null ? data.is_active : true,
      isActive: data.is_active !== null ? data.is_active : true,
      stock_quantity: data.stock_quantity,
      stockQuantity: data.stock_quantity,
      product_id: data.product_id,
      productId: data.product_id,
      sku: data.sku
    };
  } catch (error) {
    console.error("Error creating variation:", error);
    toast.error("Failed to add variation");
    return null;
  }
};

export const updateProductVariation = async (id: string, variation: Partial<ProductVariation>): Promise<ProductVariation | null> => {
  try {
    // Prepare the data for database update
    const dbVariation: any = {};
    if (variation.name !== undefined) dbVariation.name = variation.name;
    if (variation.price !== undefined) dbVariation.price = variation.price;
    if (variation.stock_quantity !== undefined) dbVariation.stock_quantity = variation.stock_quantity;
    else if (variation.stockQuantity !== undefined) dbVariation.stock_quantity = variation.stockQuantity;
    if (variation.is_active !== undefined) dbVariation.is_active = variation.is_active;
    else if (variation.isActive !== undefined) dbVariation.is_active = variation.isActive;
    if (variation.sku !== undefined) dbVariation.sku = variation.sku;
    
    const { data, error } = await supabase
      .from("product_variations")
      .update(dbVariation)
      .eq("id", id)
      .select()
      .single();
    
    if (error) {
      throw new Error(error.message);
    }
    
    toast.success("Variation updated successfully");
    
    // Map the response back to our TypeScript interface
    return {
      id: data.id,
      name: data.name,
      price: data.price,
      is_active: data.is_active !== null ? data.is_active : true,
      isActive: data.is_active !== null ? data.is_active : true,
      stock_quantity: data.stock_quantity,
      stockQuantity: data.stock_quantity,
      product_id: data.product_id,
      productId: data.product_id,
      sku: data.sku
    };
  } catch (error) {
    console.error("Error updating variation:", error);
    toast.error("Failed to update variation");
    return null;
  }
};

export const deleteProductVariation = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from("product_variations")
      .delete()
      .eq("id", id);
    
    if (error) {
      throw new Error(error.message);
    }
    
    toast.success("Variation deleted successfully");
    return true;
  } catch (error) {
    console.error("Error deleting variation:", error);
    toast.error("Failed to delete variation");
    return false;
  }
};

// File upload for product images
export const uploadProductImage = async (file: File): Promise<string | null> => {
  try {
    const fileExt = file.name.split('.').pop();
    const filePath = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    
    const { error } = await supabase.storage
      .from('product-images')
      .upload(filePath, file);
    
    if (error) {
      throw new Error(error.message);
    }
    
    const { data } = supabase.storage
      .from('product-images')
      .getPublicUrl(filePath);
    
    return data.publicUrl;
  } catch (error) {
    console.error("Error uploading image:", error);
    toast.error("Failed to upload image");
    return null;
  }
};

// Inventory transactions
export const createInventoryTransaction = async (transaction: {
  store_id: string;
  product_id: string;
  variation_id?: string;
  transaction_type: 'purchase' | 'sale' | 'adjustment' | 'return' | 'transfer';
  quantity: number;
  previous_quantity: number;
  new_quantity: number;
  reference_id?: string;
  notes?: string;
  created_by: string;
}): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from("inventory_transactions")
      .insert(transaction);
    
    if (error) {
      throw new Error(error.message);
    }
    
    toast.success("Inventory updated successfully");
    return true;
  } catch (error) {
    console.error("Error updating inventory:", error);
    toast.error("Failed to update inventory");
    return false;
  }
};

export const fetchInventoryTransactions = async (
  storeId: string,
  productId?: string,
  variationId?: string,
  limit = 50
): Promise<any[]> => {
  try {
    let query = supabase
      .from("inventory_transactions")
      .select("*, products:product_id(name)")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false })
      .limit(limit);
    
    if (productId) {
      query = query.eq("product_id", productId);
    }
    
    if (variationId) {
      query = query.eq("variation_id", variationId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      throw new Error(error.message);
    }
    
    return data || [];
  } catch (error) {
    console.error("Error fetching inventory transactions:", error);
    toast.error("Failed to load inventory history");
    return [];
  }
};

// CSV Import/Export
export const parseProductsCSV = (csvData: string): any[] => {
  const lines = csvData.split('\n');
  const headers = lines[0].split(',').map(header => header.trim());
  
  return lines.slice(1).map(line => {
    if (!line.trim()) return null;
    const values = line.split(',').map(value => value.trim());
    const product: any = {};
    
    headers.forEach((header, i) => {
      product[header] = values[i];
    });
    
    return product;
  }).filter(Boolean);
};

export const generateProductsCSV = (products: Product[]): string => {
  const headers = ['name', 'sku', 'barcode', 'description', 'price', 'cost', 'stock_quantity', 'is_active'];
  const csvRows = [headers.join(',')];
  
  products.forEach(product => {
    const row = [
      `"${product.name}"`,
      `"${product.sku}"`,
      `"${product.barcode || ''}"`,
      `"${product.description?.replace(/"/g, '""') || ''}"`,
      product.price,
      product.cost || 0,
      product.stockQuantity,
      product.isActive ? 'true' : 'false'
    ];
    
    csvRows.push(row.join(','));
  });
  
  return csvRows.join('\n');
};
