
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { uploadRecipeImage, validateImage } from '@/services/recipeManagement/imageUploadService';

interface RecipeTemplateImageUploadProps {
  imageUrl: string;
  uploadingImage: boolean;
  setUploadingImage: (uploading: boolean) => void;
  onImageChange: (url: string) => void;
}

export const RecipeTemplateImageUpload: React.FC<RecipeTemplateImageUploadProps> = ({
  imageUrl,
  uploadingImage,
  setUploadingImage,
  onImageChange
}) => {
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate image using the enhanced service
    const validation = validateImage(file);
    if (!validation.isValid) {
      toast.error(validation.error);
      return;
    }

    setUploadingImage(true);
    try {
      const result = await uploadRecipeImage(file, { folder: 'templates' });
      
      if (result.success && result.url) {
        onImageChange(result.url);
        toast.success('Image uploaded successfully');
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast.error(error.message || 'Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = () => {
    onImageChange('');
  };

  return (
    <div>
      <Label>Recipe Image</Label>
      <div className="space-y-4">
        {imageUrl ? (
          <div className="relative">
            <img 
              src={imageUrl} 
              alt="Recipe" 
              className="w-full h-48 object-cover rounded-lg"
            />
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={removeImage}
              className="absolute top-2 right-2"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <div className="mt-4">
              <Label htmlFor="image-upload" className="cursor-pointer">
                <span className="text-sm text-gray-600">Click to upload an image</span>
                <Input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                  className="hidden"
                />
              </Label>
            </div>
            {uploadingImage && (
              <div className="flex items-center justify-center mt-2">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <p className="text-sm text-blue-600">Uploading image...</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
