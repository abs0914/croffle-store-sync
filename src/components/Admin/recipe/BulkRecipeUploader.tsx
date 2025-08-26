import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import bulkUploadCroffleRecipes from '@/scripts/bulkUploadCroffleRecipes';

interface BulkRecipeUploaderProps {
  onUploadComplete?: () => void;
}

export const BulkRecipeUploader: React.FC<BulkRecipeUploaderProps> = ({
  onUploadComplete
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleBulkUpload = async () => {
    try {
      setIsUploading(true);
      setUploadStatus('idle');
      
      console.log('🚀 Starting bulk recipe upload...');
      
      await bulkUploadCroffleRecipes();
      
      setUploadStatus('success');
      toast.success('Bulk recipe upload completed successfully!');
      
      // Call the callback if provided
      if (onUploadComplete) {
        onUploadComplete();
      }
      
    } catch (error) {
      console.error('❌ Bulk upload failed:', error);
      setUploadStatus('error');
      toast.error('Bulk upload failed. Please check the console for details.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Bulk Recipe Upload
        </CardTitle>
        <CardDescription>
          Upload all 15 classic croffle recipes with their ingredients in one go.
          This will create recipe templates and commissary inventory items as needed.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Recipe List Preview */}
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Recipes to be uploaded:</strong>
            <div className="mt-2 text-sm">
              Tiramisu, Choco Nut, Caramel Delight, Choco Marshmallow, Strawberry, 
              Mango, Blueberry, Biscoff, Nutella, KitKat, Cookies & Cream, 
              Choco Overload, Matcha, Dark Chocolate
            </div>
          </AlertDescription>
        </Alert>

        {/* What this will do */}
        <div className="space-y-2">
          <h4 className="font-medium">This upload will:</h4>
          <ul className="text-sm text-muted-foreground space-y-1 ml-4">
            <li>• Create or update 15 recipe templates</li>
            <li>• Add detailed ingredients for each recipe</li>
            <li>• Create missing commissary inventory items</li>
            <li>• Set proper pricing (₱125 per croffle)</li>
            <li>• Include packaging materials (chopsticks, wax paper)</li>
          </ul>
        </div>

        {/* Upload Button */}
        <div className="flex flex-col gap-3">
          <Button
            onClick={handleBulkUpload}
            disabled={isUploading}
            className="w-full"
            size="lg"
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading Recipes...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Start Bulk Upload
              </>
            )}
          </Button>

          {/* Status Messages */}
          {uploadStatus === 'success' && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                ✅ All recipes uploaded successfully! You can now deploy them to stores.
              </AlertDescription>
            </Alert>
          )}

          {uploadStatus === 'error' && (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                ❌ Upload failed. Please check the console for error details and try again.
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Instructions */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>Note:</strong> This process may take a few minutes to complete.</p>
          <p>If any recipes already exist, they will be updated with the new ingredient data.</p>
          <p>Missing commissary items will be created automatically with default stock levels.</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default BulkRecipeUploader;
