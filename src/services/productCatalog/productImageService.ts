
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const uploadProductImage = async (file: File, productId: string): Promise<string | null> => {
  try {
    console.log('Starting product image upload for product:', productId);
    
    const fileExt = file.name.split('.').pop();
    const filePath = `products/${productId}/${Date.now()}.${fileExt}`;
    
    console.log('Uploading to path:', filePath);
    
    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    const { data } = supabase.storage
      .from('product-images')
      .getPublicUrl(filePath);

    console.log('Image uploaded successfully, public URL:', data.publicUrl);
    toast.success('Image uploaded successfully');
    return data.publicUrl;
  } catch (error) {
    console.error('Error uploading product image:', error);
    toast.error('Failed to upload image');
    return null;
  }
};

export const deleteProductImage = async (imageUrl: string): Promise<boolean> => {
  try {
    console.log('Deleting product image:', imageUrl);
    
    // Extract file path from URL
    const url = new URL(imageUrl);
    const filePath = url.pathname.split('/storage/v1/object/public/product-images/')[1];
    
    if (!filePath) {
      console.error('Could not extract file path from URL');
      return false;
    }

    console.log('Deleting file path:', filePath);

    const { error } = await supabase.storage
      .from('product-images')
      .remove([filePath]);

    if (error) {
      console.error('Delete error:', error);
      throw error;
    }
    
    console.log('Image deleted successfully');
    return true;
  } catch (error) {
    console.error('Error deleting product image:', error);
    toast.error('Failed to delete image');
    return false;
  }
};
