import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, Download, FileText, AlertCircle, CheckCircle, ChefHat } from 'lucide-react';
import { toast } from 'sonner';
import { parseRecipesCSV } from '@/utils/csvParser';
import { bulkUploadRecipes, RecipeUploadData } from '@/services/recipeUploadService';

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
      
      if (allowedTypes.includes(selectedFile.type) || selectedFile.name.endsWith('.csv')) {
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
      // Read and parse the CSV file
      const text = await file.text();
      setUploadProgress(20);
      
      console.log('Parsing CSV content:', text.substring(0, 200) + '...');
      const recipes = parseRecipesCSV(text);
      console.log('Parsed recipes:', recipes);
      
      if (recipes.length === 0) {
        toast.error('No valid recipes found in the CSV file. Please check the format.');
        setUploadResult({
          success: 0,
          failed: 1,
          errors: ['No valid recipes found in the CSV file. Please check the format and ensure all required columns are present.']
        });
        return;
      }

      setUploadProgress(50);

      // Transform RecipeUpload[] to RecipeUploadData[] ensuring category is always present
      const recipeUploadData: RecipeUploadData[] = recipes.map(recipe => ({
        name: recipe.name,
        category: recipe.category || 'General', // Ensure category is always present
        ingredients: recipe.ingredients
      }));

      // Upload recipes as templates
      console.log(`Uploading ${recipeUploadData.length} recipe templates...`);
      const success = await bulkUploadRecipes(recipeUploadData);
      
      setUploadProgress(100);

      if (success) {
        // For now, we'll show success for all recipes since bulkUploadRecipes returns a boolean
        // In the future, we could modify bulkUploadRecipes to return detailed results
        setUploadResult({
          success: recipes.length,
          failed: 0,
          errors: []
        });
        toast.success(`Successfully created ${recipes.length} recipe templates`);
        setFile(null);
      } else {
        setUploadResult({
          success: 0,
          failed: recipes.length,
          errors: ['Upload failed. Please ensure all ingredient names match items in commissary inventory exactly.']
        });
      }

    } catch (error) {
      console.error('Upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      setUploadResult({
        success: 0,
        failed: 1,
        errors: [errorMessage]
      });
      
      toast.error('Failed to upload recipe templates');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const downloadTemplate = () => {
    const csvContent = `Product,Category,Ingredient Name,Unit of Measure,Quantity Used,Cost per Unit
Tiramisu Croffle,Classic,Croissant,piece,1,30
Tiramisu Croffle,Classic,Whipped Cream,serving,1,8
Tiramisu Croffle,Classic,Tiramisu Sauce,portion,1,3.5
Tiramisu Croffle,Classic,Choco Flakes,portion,1,2.5
Tiramisu Croffle,Classic,Take out Box,piece,1,6
Tiramisu Croffle,Classic,Chopstick,pair,1,0.6
Tiramisu Croffle,Classic,Waxpaper,piece,1,0.7
Choco Nut Croffle,Classic,Croissant,piece,1,30
Choco Nut Croffle,Classic,Whipped Cream,serving,1,8
Choco Nut Croffle,Classic,Chocolate Sauce,portion,1,2.5
Choco Nut Croffle,Classic,Peanut,portion,1,2.5
Choco Nut Croffle,Classic,Take out Box,piece,1,6
Choco Nut Croffle,Classic,Chopstick,pair,1,0.6
Choco Nut Croffle,Classic,Waxpaper,piece,1,0.7`;

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
          All ingredients must exist in commissary inventory with exact name matching.
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
            Upload a CSV file containing recipe template data
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
                <li>Product - The name of the recipe/product</li>
                <li>Category - Recipe category (e.g., Classic, Overload, Mini)</li>
                <li>Ingredient Name - Must match commissary inventory items exactly</li>
                <li>Unit of Measure - Unit of measurement (piece, serving, portion, etc.)</li>
                <li>Quantity Used - Numeric quantity of the ingredient</li>
                <li>Cost per Unit - Cost per unit of ingredient (optional)</li>
              </ul>
            </div>
            <div>
              <strong>Important Notes:</strong>
              <ul className="list-disc list-inside ml-4 mt-1">
                <li>All ingredient names must exactly match items in commissary inventory</li>
                <li>Multiple ingredients for the same product should be on separate rows</li>
                <li>Recipe templates can be deployed to multiple stores</li>
                <li>Quantities must be numeric values</li>
                <li>Total cost will be calculated automatically during POS processing</li>
                <li>File size limit: 10MB</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
