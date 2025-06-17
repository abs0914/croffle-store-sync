
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const uploadProductImage = async (file: File, productId: string): Promise<string | null> => {
  try {
    const fileExt = file.name.split('.').pop();
    const filePath = `products/${productId}/${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(filePath, file);

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage
      .from('product-images')
      .getPublicUrl(filePath);

    return data.publicUrl;
  } catch (error) {
    console.error('Error uploading product image:', error);
    toast.error('Failed to upload image');
    return null;
  }
};

export const deleteProductImage = async (imageUrl: string): Promise<boolean> => {
  try {
    // Extract file path from URL
    const url = new URL(imageUrl);
    const filePath = url.pathname.split('/storage/v1/object/public/product-images/')[1];
    
    if (!filePath) return false;

    const { error } = await supabase.storage
      .from('product-images')
      .remove([filePath]);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting product image:', error);
    return false;
  }
};
