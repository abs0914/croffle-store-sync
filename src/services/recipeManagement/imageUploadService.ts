import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ImageUploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export interface ImageUploadOptions {
  maxSize?: number; // in bytes, default 5MB
  allowedTypes?: string[]; // default: ['image/jpeg', 'image/png', 'image/webp']
  generateThumbnail?: boolean; // future feature
  folder?: string; // storage folder path
}

/**
 * Upload image to recipe-images bucket with validation
 */
export const uploadRecipeImage = async (
  file: File,
  options: ImageUploadOptions = {}
): Promise<ImageUploadResult> => {
  try {
    // Default options
    const {
      maxSize = 5 * 1024 * 1024, // 5MB
      allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'],
      folder = 'templates'
    } = options;

    // Validate file type
    if (!allowedTypes.includes(file.type)) {
      return {
        success: false,
        error: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`
      };
    }

    // Validate file size
    if (file.size > maxSize) {
      const maxSizeMB = Math.round(maxSize / (1024 * 1024));
      return {
        success: false,
        error: `File size too large. Maximum size: ${maxSizeMB}MB`
      };
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const fileName = `recipe-${timestamp}-${randomId}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    console.log('📤 Uploading image:', filePath);

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('recipe-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      
      // Handle specific upload errors
      if (uploadError.message.includes('Duplicate')) {
        // Retry with new filename
        const retryFileName = `recipe-${timestamp}-${randomId}-retry.${fileExt}`;
        const retryFilePath = `${folder}/${retryFileName}`;
        
        const { error: retryError } = await supabase.storage
          .from('recipe-images')
          .upload(retryFilePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (retryError) {
          throw retryError;
        }

        // Update file path for successful retry
        const { data: { publicUrl: retryPublicUrl } } = supabase.storage
          .from('recipe-images')
          .getPublicUrl(retryFilePath);

        return {
          success: true,
          url: retryPublicUrl
        };
      } else {
        throw uploadError;
      }
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('recipe-images')
      .getPublicUrl(filePath);

    console.log('✅ Image uploaded successfully:', publicUrl);

    return {
      success: true,
      url: publicUrl
    };

  } catch (error) {
    console.error('Error uploading recipe image:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Upload failed';
    
    return {
      success: false,
      error: errorMessage
    };
  }
};

/**
 * Delete image from recipe-images bucket
 */
export const deleteRecipeImage = async (imageUrl: string): Promise<boolean> => {
  try {
    // Extract file path from URL
    const url = new URL(imageUrl);
    const pathParts = url.pathname.split('/');
    const bucketIndex = pathParts.findIndex(part => part === 'recipe-images');
    
    if (bucketIndex === -1 || bucketIndex >= pathParts.length - 1) {
      console.warn('Could not extract file path from URL:', imageUrl);
      return false;
    }

    const filePath = pathParts.slice(bucketIndex + 1).join('/');
    
    console.log('🗑️ Deleting image:', filePath);

    const { error } = await supabase.storage
      .from('recipe-images')
      .remove([filePath]);

    if (error) {
      console.error('Error deleting image:', error);
      return false;
    }

    console.log('✅ Image deleted successfully');
    return true;

  } catch (error) {
    console.error('Error deleting recipe image:', error);
    return false;
  }
};

/**
 * Update recipe template with new image URL
 */
export const updateTemplateImage = async (
  templateId: string,
  imageUrl: string
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('recipe_templates')
      .update({ image_url: imageUrl })
      .eq('id', templateId);

    if (error) {
      console.error('Error updating template image:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error updating template image:', error);
    return false;
  }
};

/**
 * Get signed URL for private image access (future feature)
 */
export const getSignedImageUrl = async (
  filePath: string,
  expiresIn: number = 3600
): Promise<string | null> => {
  try {
    const { data, error } = await supabase.storage
      .from('recipe-images')
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      console.error('Error creating signed URL:', error);
      return null;
    }

    return data.signedUrl;
  } catch (error) {
    console.error('Error getting signed URL:', error);
    return null;
  }
};

/**
 * Validate image before upload (client-side)
 */
export const validateImage = (
  file: File,
  options: ImageUploadOptions = {}
): { isValid: boolean; error?: string } => {
  const {
    maxSize = 5 * 1024 * 1024,
    allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
  } = options;

  // Check file type
  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: `Invalid file type. Please select: ${allowedTypes.map(t => t.split('/')[1]).join(', ')}`
    };
  }

  // Check file size
  if (file.size > maxSize) {
    const maxSizeMB = Math.round(maxSize / (1024 * 1024));
    return {
      isValid: false,
      error: `File size too large. Maximum size: ${maxSizeMB}MB`
    };
  }

  // Check if it's actually an image
  if (!file.type.startsWith('image/')) {
    return {
      isValid: false,
      error: 'Please select an image file'
    };
  }

  return { isValid: true };
};

/**
 * Enhanced image upload with preview generation
 */
export const uploadRecipeImageWithPreview = async (
  file: File,
  options: ImageUploadOptions = {}
): Promise<ImageUploadResult & { preview?: string }> => {
  try {
    // Validate first
    const validation = validateImage(file, options);
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.error
      };
    }

    // Generate preview URL
    const preview = URL.createObjectURL(file);

    // Upload image
    const uploadResult = await uploadRecipeImage(file, options);

    return {
      ...uploadResult,
      preview: uploadResult.success ? undefined : preview // Only keep preview if upload failed
    };

  } catch (error) {
    console.error('Error in enhanced image upload:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed'
    };
  }
};

/**
 * Batch image operations for multiple images
 */
export const batchImageOperations = async (
  operations: Array<{
    type: 'upload' | 'delete';
    file?: File;
    url?: string;
    options?: ImageUploadOptions;
  }>
): Promise<Array<{ success: boolean; url?: string; error?: string }>> => {
  const results = await Promise.allSettled(
    operations.map(async (op) => {
      if (op.type === 'upload' && op.file) {
        return await uploadRecipeImage(op.file, op.options);
      } else if (op.type === 'delete' && op.url) {
        const success = await deleteRecipeImage(op.url);
        return { success };
      } else {
        return { success: false, error: 'Invalid operation' };
      }
    })
  );

  return results.map((result) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return { success: false, error: result.reason.message || 'Operation failed' };
    }
  });
};

/**
 * Check storage bucket configuration
 */
export const checkStorageConfiguration = async (): Promise<{
  isConfigured: boolean;
  bucketExists: boolean;
  error?: string;
}> => {
  try {
    // Test bucket access by trying to list files
    const { data, error } = await supabase.storage
      .from('recipe-images')
      .list('', { limit: 1 });

    if (error) {
      console.error('Storage configuration error:', error);
      return {
        isConfigured: false,
        bucketExists: false,
        error: error.message
      };
    }

    return {
      isConfigured: true,
      bucketExists: true
    };

  } catch (error) {
    console.error('Error checking storage configuration:', error);
    return {
      isConfigured: false,
      bucketExists: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};