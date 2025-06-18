
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, Download, FileText, AlertCircle, CheckCircle, ChefHat } from 'lucide-react';
import { toast } from 'sonner';

interface UploadResult {
  success: number;
  failed: number;
  errors: string[];
}

export const AdminRecipeBulkUploadTab: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      const allowedTypes = [
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ];
      
      if (allowedTypes.includes(selectedFile.type)) {
        setFile(selectedFile);
        setUploadResult(null);
      } else {
        toast.error('Please select a CSV or Excel file');
      }
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      await new Promise(resolve => setTimeout(resolve, 3000));
      
      clearInterval(progressInterval);
      setUploadProgress(100);

      const result: UploadResult = {
        success: 12,
        failed: 3,
        errors: [
          'Row 5: Commissary item "Organic Flour" not found in inventory',
          'Row 12: Invalid quantity format for ingredient "Sugar"',
          'Row 18: Recipe name "Chocolate Cake" already exists'
        ]
      };

      setUploadResult(result);
      toast.success(`Successfully uploaded ${result.success} recipe templates`);

      if (result.failed > 0) {
        toast.warning(`${result.failed} recipe templates failed to upload. Check the results below.`);
      }

    } catch (error) {
      toast.error('Failed to upload recipe templates');
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const downloadTemplate = () => {
    const csvContent = `Recipe Name,Description,Category,Instructions,Yield Quantity,Serving Size,Ingredient Name,Quantity,Unit,Cost Per Unit,Notes
Chocolate Chip Cookie,Classic chocolate chip cookie,Baked Goods,"Mix dry ingredients. Add wet ingredients. Fold in chocolate chips. Bake at 350°F for 12 minutes.",24,1,All-Purpose Flour,2,cups,0.50,From commissary inventory
Chocolate Chip Cookie,Classic chocolate chip cookie,Baked Goods,"Mix dry ingredients. Add wet ingredients. Fold in chocolate chips. Bake at 350°F for 12 minutes.",24,1,Granulated Sugar,1,cup,0.75,From commissary inventory
Chocolate Chip Cookie,Classic chocolate chip cookie,Baked Goods,"Mix dry ingredients. Add wet ingredients. Fold in chocolate chips. Bake at 350°F for 12 minutes.",24,1,Chocolate Chips,1,cup,2.00,From commissary inventory
Basic Bread,Simple white bread recipe,Bakery,Mix ingredients. Knead. Let rise. Bake at 375°F for 30 minutes.,2,8,Bread Flour,3,cups,0.60,From commissary inventory
Basic Bread,Simple white bread recipe,Bakery,Mix ingredients. Knead. Let rise. Bake at 375°F for 30 minutes.,2,8,Active Dry Yeast,1,packet,0.25,From commissary inventory`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'recipe_template_bulk_upload.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Context Alert */}
      <Alert>
        <ChefHat className="h-4 w-4" />
        <AlertDescription>
          Upload recipe templates that will be available for deployment to all stores. 
          All ingredients must exist in commissary inventory.
        </AlertDescription>
      </Alert>

      {/* Template Download */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Download Template
          </CardTitle>
          <CardDescription>
            Download a CSV template with the correct format for bulk recipe template upload
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={downloadTemplate} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Download CSV Template
          </Button>
        </CardContent>
      </Card>

      {/* File Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Recipe Templates
          </CardTitle>
          <CardDescription>
            Upload a CSV or Excel file containing recipe template data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="recipe-file">Select File</Label>
            <Input
              id="recipe-file"
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileSelect}
              className="mt-1"
            />
          </div>

          {file && (
            <Alert>
              <FileText className="h-4 w-4" />
              <AlertDescription>
                Selected file: {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </AlertDescription>
            </Alert>
          )}

          {isUploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Processing recipe templates...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} />
            </div>
          )}

          <Button 
            onClick={handleUpload} 
            disabled={!file || isUploading}
            className="w-full"
          >
            {isUploading ? (
              <>Processing...</>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload Recipe Templates
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Upload Results */}
      {uploadResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {uploadResult.failed > 0 ? (
                <AlertCircle className="h-5 w-5 text-amber-500" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-500" />
              )}
              Upload Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {uploadResult.success}
                </div>
                <div className="text-sm text-green-700">Successful</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {uploadResult.failed}
                </div>
                <div className="text-sm text-red-700">Failed</div>
              </div>
            </div>

            {uploadResult.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium mb-2">Upload Errors:</div>
                  <ul className="list-disc list-inside space-y-1">
                    {uploadResult.errors.map((error, index) => (
                      <li key={index} className="text-sm">{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Format Guidelines */}
      <Card>
        <CardHeader>
          <CardTitle>Format Guidelines</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div>
              <strong>Required Columns:</strong>
              <ul className="list-disc list-inside ml-4 mt-1">
                <li>Recipe Name - The name of the recipe template</li>
                <li>Description - Brief description of the recipe</li>
                <li>Category - Recipe category (e.g., Baked Goods, Beverages)</li>
                <li>Instructions - Step-by-step cooking instructions</li>
                <li>Yield Quantity - Number of servings/items produced</li>
                <li>Serving Size - Size per serving (optional)</li>
                <li>Ingredient Name - Must match commissary inventory items exactly</li>
                <li>Quantity - Numeric quantity of the ingredient</li>
                <li>Unit - Unit of measurement (cups, grams, etc.)</li>
                <li>Cost Per Unit - Cost per unit of ingredient (optional)</li>
              </ul>
            </div>
            <div>
              <strong>Important Notes:</strong>
              <ul className="list-disc list-inside ml-4 mt-1">
                <li>All ingredient names must exactly match items in commissary inventory</li>
                <li>Multiple ingredients for the same recipe should be on separate rows</li>
                <li>Recipe templates can be deployed to multiple stores</li>
                <li>Quantities must be numeric values</li>
                <li>File size limit: 10MB</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
