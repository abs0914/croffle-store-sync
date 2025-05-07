
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
    
    return data || [];
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
    
    return data;
  } catch (error) {
    console.error("Error fetching product:", error);
    toast.error("Failed to load product details");
    return null;
  }
};

export const createProduct = async (product: Omit<Product, "id">): Promise<Product | null> => {
  try {
    const { data, error } = await supabase
      .from("products")
      .insert(product)
      .select()
      .single();
    
    if (error) {
      throw new Error(error.message);
    }
    
    toast.success("Product created successfully");
    return data;
  } catch (error) {
    console.error("Error creating product:", error);
    toast.error("Failed to create product");
    return null;
  }
};

export const updateProduct = async (id: string, product: Partial<Product>): Promise<Product | null> => {
  try {
    const { data, error } = await supabase
      .from("products")
      .update(product)
      .eq("id", id)
      .select()
      .single();
    
    if (error) {
      throw new Error(error.message);
    }
    
    toast.success("Product updated successfully");
    return data;
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
    
    return data || [];
  } catch (error) {
    console.error("Error fetching variations:", error);
    return [];
  }
};

export const createProductVariation = async (variation: Omit<ProductVariation, "id">): Promise<ProductVariation | null> => {
  try {
    const { data, error } = await supabase
      .from("product_variations")
      .insert(variation)
      .select()
      .single();
    
    if (error) {
      throw new Error(error.message);
    }
    
    toast.success("Variation added successfully");
    return data;
  } catch (error) {
    console.error("Error creating variation:", error);
    toast.error("Failed to add variation");
    return null;
  }
};

export const updateProductVariation = async (id: string, variation: Partial<ProductVariation>): Promise<ProductVariation | null> => {
  try {
    const { data, error } = await supabase
      .from("product_variations")
      .update(variation)
      .eq("id", id)
      .select()
      .single();
    
    if (error) {
      throw new Error(error.message);
    }
    
    toast.success("Variation updated successfully");
    return data;
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
