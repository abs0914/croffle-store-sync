
import { supabase } from "@/integrations/supabase/client";
import { Product } from "@/types";
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
