/**
 * Centralized Recipe Template Image Service
 * Handles image uploads to recipe templates for consistent product images across all stores
 */

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const uploadRecipeTemplateImage = async (
  file: File, 
  recipeId: string
): Promise<string | null> => {
  try {
    console.log('🖼️ Uploading image to recipe template:', recipeId);
    
    const fileExt = file.name.split('.').pop();
    const fileName = `recipe-${recipeId}-${Date.now()}.${fileExt}`;
    const filePath = `recipe-templates/${fileName}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      console.error('❌ Recipe image upload failed:', uploadError);
      throw uploadError;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('product-images')
      .getPublicUrl(filePath);

    console.log('✅ Recipe image uploaded successfully:', publicUrl);

    // Update recipe template with image URL
    const { error: updateError } = await supabase
      .from('recipe_templates')
      .update({ image_url: publicUrl })
      .eq('id', recipeId);

    if (updateError) {
      console.error('❌ Failed to update recipe template with image:', updateError);
      throw updateError;
    }

    console.log('✅ Recipe template updated with image URL');
    return publicUrl;
  } catch (error) {
    console.error('Error uploading recipe template image:', error);
    toast.error('Failed to upload image');
    return null;
  }
};

export const deleteRecipeTemplateImage = async (imageUrl: string): Promise<boolean> => {
  try {
    // Extract file path from URL
    const urlParts = imageUrl.split('/');
    const filePath = `recipe-templates/${urlParts[urlParts.length - 1]}`;

    const { error } = await supabase.storage
      .from('product-images')
      .remove([filePath]);

    if (error) {
      console.error('Error deleting recipe image:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error deleting recipe image:', error);
    return false;
  }
};

/**
 * Get the effective image URL for a product
 * Prioritizes recipe template image, falls back to product-specific image
 */
export const getProductImageUrl = (
  productImageUrl: string | null | undefined,
  recipeTemplateImageUrl: string | null | undefined
): string | undefined => {
  // Use recipe template image if available (centralized approach)
  if (recipeTemplateImageUrl) {
    return recipeTemplateImageUrl;
  }
  
  // Fall back to product-specific image
  if (productImageUrl) {
    return productImageUrl;
  }
  
  // No image available
  return undefined;
};
