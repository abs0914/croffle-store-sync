import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Loader2 } from 'lucide-react';
import { bulkUploadRecipeTemplates, recipeData } from '@/services/recipeManagement/bulkRecipeUpload';
import { supabase } from '@/integrations/supabase/client';

export function BulkRecipeUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ successCount: number; errorCount: number; errors: string[] } | null>(null);

  const handleBulkUpload = async () => {
    try {
      setIsUploading(true);
      setUploadResult(null);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const result = await bulkUploadRecipeTemplates(recipeData, user.id);
      setUploadResult(result);
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Bulk Recipe Upload
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Upload 14 pre-configured recipe templates including Classic, Fruity, and Premium categories.
          </p>
          
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <h4 className="font-medium text-green-600">Classic (4 recipes)</h4>
              <ul className="text-xs text-muted-foreground mt-1">
                <li>• Tiramisu</li>
                <li>• Choco Nut</li>
                <li>• Caramel Delight</li>
                <li>• Choco Marshmallow</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium text-blue-600">Fruity (3 recipes)</h4>
              <ul className="text-xs text-muted-foreground mt-1">
                <li>• Strawberry</li>
                <li>• Mango</li>
                <li>• Blueberry</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium text-purple-600">Premium (7 recipes)</h4>
              <ul className="text-xs text-muted-foreground mt-1">
                <li>• Biscoff</li>
                <li>• Nutella</li>
                <li>• Kitkat</li>
                <li>• Cookies & Cream</li>
                <li>• Choco Overload</li>
                <li>• Matcha</li>
                <li>• Dark Chocolate</li>
              </ul>
            </div>
          </div>

          <Button 
            onClick={handleBulkUpload} 
            disabled={isUploading}
            className="w-full"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading Templates...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload All Recipe Templates
              </>
            )}
          </Button>

          {uploadResult && (
            <div className="mt-4 p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Upload Results</h4>
              <div className="space-y-2 text-sm">
                <div className="text-green-600">
                  ✓ Successfully uploaded: {uploadResult.successCount} templates
                </div>
                {uploadResult.errorCount > 0 && (
                  <div className="text-red-600">
                    ✗ Failed uploads: {uploadResult.errorCount}
                    {uploadResult.errors.length > 0 && (
                      <ul className="mt-1 ml-4 text-xs">
                        {uploadResult.errors.map((error, index) => (
                          <li key={index}>• {error}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}