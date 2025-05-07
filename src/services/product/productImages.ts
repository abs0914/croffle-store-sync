
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
