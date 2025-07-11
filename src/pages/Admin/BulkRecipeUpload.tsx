import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import BulkRecipeUploader from '@/components/Admin/recipe/BulkRecipeUploader';

export default function BulkRecipeUpload() {
  const navigate = useNavigate();

  const handleUploadComplete = () => {
    // Optionally navigate back to recipe templates after successful upload
    setTimeout(() => {
      navigate('/admin/recipe-templates');
    }, 2000);
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/admin/recipe-templates')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Recipe Templates
          </Button>
        </div>

        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Bulk Recipe Upload</h1>
            <p className="text-muted-foreground mt-2">
              Upload all classic croffle recipes with their ingredients in one batch operation.
            </p>
          </div>

          {/* Bulk Uploader Component */}
          <div className="flex justify-center">
            <BulkRecipeUploader onUploadComplete={handleUploadComplete} />
          </div>

          {/* Additional Information */}
          <div className="max-w-2xl mx-auto space-y-4 text-sm text-muted-foreground">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-2">What happens after upload?</h3>
              <ul className="space-y-1 text-blue-800">
                <li>1. Recipe templates will be created with all ingredients</li>
                <li>2. You can review and edit any recipe template if needed</li>
                <li>3. Deploy recipes to specific stores using the deployment feature</li>
                <li>4. Deployed recipes will appear in the POS system automatically</li>
              </ul>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h3 className="font-medium text-amber-900 mb-2">Important Notes:</h3>
              <ul className="space-y-1 text-amber-800">
                <li>• This will create commissary inventory items if they don't exist</li>
                <li>• Existing recipes will be updated with new ingredient data</li>
                <li>• Default stock levels will be set for new commissary items</li>
                <li>• You may need to adjust stock quantities after upload</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
