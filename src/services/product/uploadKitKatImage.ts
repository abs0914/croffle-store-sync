import { supabase } from "@/integrations/supabase/client";
import kitkatImage from "@/assets/kitkat-biscuit.jpg";

// Helper to convert image import to blob
async function imageToBlob(imageSrc: string): Promise<Blob> {
  const response = await fetch(imageSrc);
  return await response.blob();
}

export async function uploadKitKatImageAndUpdateProducts() {
  try {
    // Convert the imported image to a blob
    const imageBlob = await imageToBlob(kitkatImage);
    
    // Upload to Supabase storage
    const fileName = `kitkat-biscuit-${Date.now()}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(`products/${fileName}`, imageBlob, {
        contentType: 'image/jpeg',
        upsert: false
      });
    
    if (uploadError) throw uploadError;
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(`products/${fileName}`);
    
    const imageUrl = urlData.publicUrl;
    
    // Update all KitKat Biscuit products with the image URL
    const { error: updateError } = await supabase
      .from('product_catalog')
      .update({ image_url: imageUrl })
      .eq('product_name', 'KitKat Biscuit')
      .is('image_url', null);
    
    if (updateError) throw updateError;
    
    console.log('✅ KitKat image uploaded and products updated');
    return imageUrl;
  } catch (error) {
    console.error('❌ Error uploading KitKat image:', error);
    throw error;
  }
}
