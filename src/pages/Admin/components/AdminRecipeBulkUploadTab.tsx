
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, Download, FileText, AlertCircle, CheckCircle, ChefHat, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { parseRecipesCSV } from '@/utils/csvParser';
import { bulkUploadRecipes, RecipeUploadData } from '@/services/recipeUploadService';
import { fetchCommissaryInventory } from '@/services/inventoryManagement/commissaryInventoryService';
import { CommissaryInventoryItem } from '@/types/commissary';

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
  const [commissaryItems, setCommissaryItems] = useState<CommissaryInventoryItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);

  useEffect(() => {
    fetchCommissaryItems();
  }, []);

  const fetchCommissaryItems = async () => {
    setIsLoadingItems(true);
    try {
      const items = await fetchCommissaryInventory();
      setCommissaryItems(items);
    } catch (error) {
      console.error('Error fetching commissary items:', error);
      toast.error('Failed to load commissary inventory items');
    } finally {
      setIsLoadingItems(false);
    }
  };

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

      // Transform RecipeUpload[] to RecipeUploadData[]
      const recipeUploadData: RecipeUploadData[] = recipes.map(recipe => ({
        name: recipe.name,
        category: recipe.category || 'General',
        ingredients: recipe.ingredients.map(ing => ({
          ingredient_name: ing.commissary_item_name,
          unit: ing.uom,
          quantity: ing.quantity,
          cost_per_unit: ing.cost_per_unit || 0
        }))
      }));

      console.log(`Uploading ${recipeUploadData.length} recipe templates...`);
      const success = await bulkUploadRecipes(recipeUploadData);
      
      setUploadProgress(100);

      if (success) {
        setUploadResult({
          success: recipes.length,
          failed: 0,
          errors: []
        });
        toast.success(`Successfully created ${recipes.length} recipe templates! Check the console for detailed processing logs.`);
        setFile(null);
      } else {
        setUploadResult({
          success: 0,
          failed: recipes.length,
          errors: ['Upload failed. Please check console for detailed error information.']
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
    let csvContent = `Product,Category,Ingredient Name,Unit of Measure,Quantity Used,Cost per Unit\n`;
    
    if (commissaryItems.length > 0) {
      const sampleItems = commissaryItems.slice(0, 6);
      
      if (sampleItems.length >= 3) {
        csvContent += `Sample Product A,Classic,${sampleItems[0].name},${sampleItems[0].uom || 'piece'},1,${sampleItems[0].unit_cost || 10}\n`;
        csvContent += `Sample Product A,Classic,${sampleItems[1].name},${sampleItems[1].uom || 'piece'},0.5,${sampleItems[1].unit_cost || 5}\n`;
        csvContent += `Sample Product A,Classic,${sampleItems[2].name},${sampleItems[2].uom || 'piece'},1,${sampleItems[2].unit_cost || 3}\n`;
      }
      
      if (sampleItems.length >= 6) {
        csvContent += `Sample Product B,Special,${sampleItems[3].name},${sampleItems[3].uom || 'piece'},2,${sampleItems[3].unit_cost || 10}\n`;
        csvContent += `Sample Product B,Special,${sampleItems[4].name},${sampleItems[4].uom || 'piece'},1,${sampleItems[4].unit_cost || 8}\n`;
        csvContent += `Sample Product B,Special,${sampleItems[5].name},${sampleItems[5].uom || 'piece'},0.25,${sampleItems[5].unit_cost || 6}\n`;
      }
      
      // Add example for choice-based ingredients
      csvContent += `Croffle Overload,Overload,Choose 1: Chocolate Sauce OR Caramel Sauce,portion,1,2.5\n`;
      csvContent += `Mini Croffle,Mini,Choose 1: Vanilla Ice Cream OR Strawberry Ice Cream,scoop,1,15\n`;
    } else {
      csvContent += `Sample Product A,Classic,Sample Ingredient 1,piece,1,10\n`;
      csvContent += `Sample Product A,Classic,Sample Ingredient 2,serving,1,5\n`;
      csvContent += `Sample Product A,Classic,Sample Ingredient 3,portion,1,3\n`;
      csvContent += `Sample Product B,Special,Sample Ingredient 1,piece,2,10\n`;
      csvContent += `Sample Product B,Special,Sample Ingredient 4,ml,50,0.5\n`;
      csvContent += `Sample Product B,Special,Sample Ingredient 5,piece,1,8\n`;
      csvContent += `Croffle Overload,Overload,Choose 1: Chocolate Sauce OR Caramel Sauce,portion,1,2.5\n`;
      csvContent += `Mini Croffle,Mini,Choose 1: Vanilla Ice Cream OR Strawberry Ice Cream,scoop,1,15`;
    }

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
          <strong>Enhanced Upload System:</strong> Upload recipe templates that will be available for deployment to all stores. 
          The system now supports choice-based ingredients (e.g., "Choose 1: Chocolate Sauce OR Caramel Sauce").
        </AlertDescription>
      </Alert>

      {/* Available Items Display */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Available Commissary Items ({commissaryItems.length})</CardTitle>
            <Button
              onClick={fetchCommissaryItems}
              variant="outline"
              size="sm"
              disabled={isLoadingItems}
            >
              {isLoadingItems ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Refresh
            </Button>
          </div>
          <CardDescription>
            These are the exact ingredient names you should use in your CSV file (for reference)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-40 overflow-y-auto border rounded-md p-3 bg-muted/20">
            {isLoadingItems ? (
              <p className="text-sm text-muted-foreground">Loading items...</p>
            ) : commissaryItems.length > 0 ? (
              <div className="grid grid-cols-3 gap-2 text-xs">
                {commissaryItems.map((item) => (
                  <div key={item.id} className="truncate p-1 bg-background rounded border">
                    <div className="font-medium">{item.name}</div>
                    <div className="text-muted-foreground">({item.uom || 'piece'})</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No items found in commissary inventory</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Template Download */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Download Template
          </CardTitle>
          <CardDescription>
            Download a CSV template with examples including choice-based ingredients
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={downloadTemplate} variant="outline" disabled={isLoadingItems}>
            <Download className="h-4 w-4 mr-2" />
            Download Enhanced CSV Template
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
            Upload a CSV file containing recipe template data with enhanced ingredient support
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
              <>Processing Templates...</>
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
          <CardTitle>Enhanced Format Guidelines</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div>
              <strong>Required Columns:</strong>
              <ul className="list-disc list-inside ml-4 mt-1">
                <li>Product - The name of the recipe/product</li>
                <li>Category - Recipe category (e.g., Classic, Overload, Mini)</li>
                <li>Ingredient Name - Ingredient name or choice description</li>
                <li>Unit of Measure - Unit of measurement (piece, serving, portion, etc.)</li>
                <li>Quantity Used - Numeric quantity of the ingredient</li>
                <li>Cost per Unit - Cost per unit of ingredient (optional)</li>
              </ul>
            </div>
            <div>
              <strong>Choice-Based Ingredients:</strong>
              <ul className="list-disc list-inside ml-4 mt-1">
                <li>Use format: "Choose 1: Option A OR Option B OR Option C"</li>
                <li>Example: "Choose 1: Chocolate Sauce OR Caramel Sauce"</li>
                <li>System will create separate ingredient entries for each option</li>
                <li>All options will be available for selection during deployment</li>
              </ul>
            </div>
            <div>
              <strong>Important Notes:</strong>
              <ul className="list-disc list-inside ml-4 mt-1">
                <li>Multiple ingredients for the same product should be on separate rows</li>
                <li>Recipe templates can be deployed to multiple stores</li>
                <li>Quantities must be numeric values</li>
                <li>Enhanced error handling and detailed console logging</li>
                <li>Templates are created even if some ingredients fail</li>
                <li>File size limit: 10MB</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
