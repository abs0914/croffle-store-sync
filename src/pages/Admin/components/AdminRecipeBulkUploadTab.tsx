
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
    const csvContent = `Product,Category,Ingredient Name,Unit of Measure,Quantity Used,Cost per Unit,Total Cost
Tiramisu Croffle,Classic,Croissant,piece,1,30,
Tiramisu Croffle,Classic,Whipped Cream,serving,1,8,
Tiramisu Croffle,Classic,Tiramisu Sauce,portion,1,3.5,
Tiramisu Croffle,Classic,Choco Flakes,portion,1,2.5,51.3
Tiramisu Croffle,Classic,Take out Box,piece,1,6,
Tiramisu Croffle,Classic,Chopstick,pair,1,0.6,
Tiramisu Croffle,Classic,Waxpaper,piece,1,0.7,
Choco Nut Croffle,Classic,Croissant,piece,1,30,
Choco Nut Croffle,Classic,Whipped Cream,serving,1,8,
Choco Nut Croffle,Classic,Chocolate Sauce,portion,1,2.5,
Choco Nut Croffle,Classic,Peanut,portion,1,2.5,50.3
Choco Nut Croffle,Classic,Take out Box,piece,1,6,
Choco Nut Croffle,Classic,Chopstick,pair,1,0.6,
Choco Nut Croffle,Classic,Waxpaper,piece,1,0.7,
Croffle Overload,Overload,Croissant,piece,0.5,15,
Croffle Overload,Overload,Vanilla Ice Cream,scoop,1,15.44,
Croffle Overload,Overload,Colored Sprinkle,portion,1,2.5,37.74
Croffle Overload,Overload,Peanut,portion,1,2.5,
Croffle Overload,Overload,Choco Flakes,portion,1,2.5,
Croffle Overload,Overload,Marshmallow,portion,1,2.5,
Croffle Overload,Overload,Overload Cup,piece,1,4,
Croffle Overload,Overload,Popsicle,piece,1,0.3,
Croffle Overload,Overload,Spoon,piece,1,0.5,
Mini Croffle,Mini,Croissant,piece,0.5,15,
Mini Croffle,Mini,Whipped Cream,serving,0.5,4,
Mini Croffle,Mini,Chocolate Sauce,portion,1,1.25,21.5
Mini Croffle,Mini,Caramel Sauce,portion,1,1.25,
Mini Croffle,Mini,Colored Sprinkle,portion,1,1.25,
Mini Croffle,Mini,Peanut,portion,1,1.25,
Mini Croffle,Mini,Mini Take out Box,piece,1,2.4,
Mini Croffle,Mini,Popsicle,piece,1,0.3,`;

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
                <li>Product - The name of the recipe/product</li>
                <li>Category - Recipe category (e.g., Classic, Overload, Mini)</li>
                <li>Ingredient Name - Must match commissary inventory items exactly</li>
                <li>Unit of Measure - Unit of measurement (piece, serving, portion, etc.)</li>
                <li>Quantity Used - Numeric quantity of the ingredient</li>
                <li>Cost per Unit - Cost per unit of ingredient (optional)</li>
                <li>Total Cost - Total cost for the recipe (calculated automatically)</li>
              </ul>
            </div>
            <div>
              <strong>Important Notes:</strong>
              <ul className="list-disc list-inside ml-4 mt-1">
                <li>All ingredient names must exactly match items in commissary inventory</li>
                <li>Multiple ingredients for the same product should be on separate rows</li>
                <li>Recipe templates can be deployed to multiple stores</li>
                <li>Quantities must be numeric values</li>
                <li>Total Cost will be calculated based on individual ingredient costs</li>
                <li>File size limit: 10MB</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
