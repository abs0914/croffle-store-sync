import { checkStorageConfiguration } from '@/services/recipeManagement/imageUploadService';
import { toast } from 'sonner';

interface ImageUploadTestResult {
  storageConfigured: boolean;
  uploadCapable: boolean;
  errors: string[];
}

export const testImageUploadSystem = async (): Promise<ImageUploadTestResult> => {
  const result: ImageUploadTestResult = {
    storageConfigured: false,
    uploadCapable: false,
    errors: []
  };

  try {
    // Test storage configuration
    const storageCheck = await checkStorageConfiguration();
    
    if (!storageCheck.isConfigured) {
      result.errors.push('Storage bucket not properly configured');
      if (storageCheck.error) {
        result.errors.push(`Storage error: ${storageCheck.error}`);
      }
    } else {
      result.storageConfigured = true;
    }

    // Test bucket accessibility
    if (storageCheck.bucketExists) {
      result.uploadCapable = true;
    } else {
      result.errors.push('Recipe images bucket does not exist');
    }

    // Log results for debugging
    console.log('📊 Image Upload System Test Results:', {
      storageConfigured: result.storageConfigured,
      uploadCapable: result.uploadCapable,
      errors: result.errors
    });

    if (result.errors.length > 0) {
      console.warn('⚠️ Image upload system issues found:', result.errors);
    } else {
      console.log('✅ Image upload system is properly configured');
    }

  } catch (error) {
    console.error('❌ Error testing image upload system:', error);
    result.errors.push('Failed to test image upload system');
  }

  return result;
};

export const initializeImageUploadSystem = async (): Promise<void> => {
  const testResult = await testImageUploadSystem();
  
  if (!testResult.uploadCapable && testResult.errors.length > 0) {
    console.error('Image upload system initialization failed:', testResult.errors);
    toast.error('Image upload system not properly configured');
  }
};

export default {
  testImageUploadSystem,
  initializeImageUploadSystem
};