import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  Rocket, 
  CheckCircle, 
  AlertTriangle, 
  Loader2,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { quickUploadAllRecipes, getAvailableRecipeFiles } from '@/services/recipeUpload/recipeFileLoader';

interface QuickRecipeUploadProps {
  onUploadComplete?: () => void;
}

export const QuickRecipeUpload: React.FC<QuickRecipeUploadProps> = ({
  onUploadComplete
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    success: boolean;
    totalRecipes: number;
    errors: string[];
  } | null>(null);

  const availableFiles = getAvailableRecipeFiles();

  const handleQuickUpload = async () => {
    setIsUploading(true);
    setUploadResult(null);

    try {
      toast.info('Starting bulk upload of all recipe files...');
      
      const result = await quickUploadAllRecipes();
      setUploadResult(result);

      if (result.success) {
        toast.success(`Successfully uploaded ${result.totalRecipes} recipes!`);
        if (onUploadComplete) {
          onUploadComplete();
        }
      } else {
        toast.error('Upload failed. Check the details below.');
      }

    } catch (error) {
      toast.error('Upload failed');
      console.error('Upload error:', error);
      setUploadResult({
        success: false,
        totalRecipes: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Rocket className="h-5 w-5" />
          Quick Recipe Upload
        </CardTitle>
        <CardDescription>
          Upload all recipe files from the scripts/recipes directory in one click.
          This will process croffle, coffee, and drink recipes automatically.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Available Files */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Available Recipe Files:</h4>
          <div className="flex flex-wrap gap-2">
            {availableFiles.map((filename, index) => (
              <Badge key={index} variant="outline" className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                {filename}
              </Badge>
            ))}
          </div>
        </div>

        {/* What this will do */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">This upload will:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Process all markdown recipe files</li>
            <li>• Create recipe templates with ingredients</li>
            <li>• Create missing commissary inventory items</li>
            <li>• Update existing recipes if they exist</li>
            <li>• Set default stock levels (100 units)</li>
          </ul>
        </div>

        {/* Upload Button */}
        <Button
          onClick={handleQuickUpload}
          disabled={isUploading}
          className="w-full"
          size="lg"
        >
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading All Recipes...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Upload All Recipe Files
            </>
          )}
        </Button>

        {/* Upload Result */}
        {uploadResult && (
          <Alert className={uploadResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
            {uploadResult.success ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-red-600" />
            )}
            <AlertDescription className={uploadResult.success ? "text-green-800" : "text-red-800"}>
              {uploadResult.success ? (
                <div>
                  <strong>Upload Successful!</strong>
                  <div className="mt-1">
                    {uploadResult.totalRecipes} recipes uploaded successfully.
                    Ready for deployment to stores.
                  </div>
                </div>
              ) : (
                <div>
                  <strong>Upload Failed</strong>
                  {uploadResult.errors.length > 0 && (
                    <div className="mt-2">
                      <div className="font-medium mb-1">Errors:</div>
                      <ul className="text-sm space-y-1">
                        {uploadResult.errors.slice(0, 3).map((error, index) => (
                          <li key={index}>• {error}</li>
                        ))}
                        {uploadResult.errors.length > 3 && (
                          <li>• ... and {uploadResult.errors.length - 3} more errors</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Instructions */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>Note:</strong> This is a quick way to upload all predefined recipes.</p>
          <p>For custom recipe files, use the full Markdown Upload interface.</p>
          <p>After upload, use the Recipe Deployment service to deploy to stores.</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default QuickRecipeUpload;
