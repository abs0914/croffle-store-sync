import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { 
  uploadRecipeImage, 
  validateImage, 
  deleteRecipeImage,
  ImageUploadOptions,
  ImageUploadResult 
} from '@/services/recipeManagement/imageUploadService';

interface ImageUploadHookOptions {
  folder?: string;
  maxSize?: number;
  allowedTypes?: string[];
  onUploadSuccess?: (url: string) => void;
  onUploadError?: (error: string) => void;
}

export const useImageUpload = (options: ImageUploadHookOptions = {}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const uploadImage = useCallback(async (
    file: File,
    customOptions?: Partial<ImageUploadOptions>
  ): Promise<ImageUploadResult> => {
    // Validate image first
    const validation = validateImage(file, {
      maxSize: options.maxSize,
      allowedTypes: options.allowedTypes,
      ...customOptions
    });

    if (!validation.isValid) {
      const error = validation.error || 'Invalid image file';
      toast.error(error);
      options.onUploadError?.(error);
      return { success: false, error };
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Simulate upload progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const result = await uploadRecipeImage(file, {
        folder: options.folder || 'templates',
        ...customOptions
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (result.success && result.url) {
        toast.success('Image uploaded successfully');
        options.onUploadSuccess?.(result.url);
      } else {
        const error = result.error || 'Upload failed';
        toast.error(error);
        options.onUploadError?.(error);
      }

      return result;
    } catch (error: any) {
      const errorMessage = error.message || 'Upload failed';
      toast.error(errorMessage);
      options.onUploadError?.(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [options]);

  const removeImage = useCallback(async (imageUrl: string): Promise<boolean> => {
    try {
      const success = await deleteRecipeImage(imageUrl);
      if (success) {
        toast.success('Image removed successfully');
      } else {
        toast.error('Failed to remove image');
      }
      return success;
    } catch (error) {
      console.error('Error removing image:', error);
      toast.error('Failed to remove image');
      return false;
    }
  }, []);

  const handleFileSelect = useCallback(async (
    event: React.ChangeEvent<HTMLInputElement>,
    customOptions?: Partial<ImageUploadOptions>
  ): Promise<ImageUploadResult | null> => {
    const file = event.target.files?.[0];
    if (!file) return null;

    return await uploadImage(file, customOptions);
  }, [uploadImage]);

  return {
    isUploading,
    uploadProgress,
    uploadImage,
    removeImage,
    handleFileSelect,
    validateImage: (file: File) => validateImage(file, {
      maxSize: options.maxSize,
      allowedTypes: options.allowedTypes
    })
  };
};

export default useImageUpload;