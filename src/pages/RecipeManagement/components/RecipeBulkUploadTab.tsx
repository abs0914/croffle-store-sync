
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, Download, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface UploadResult {
  success: number;
  failed: number;
  errors: string[];
}

export const RecipeBulkUploadTab: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      // Validate file type
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
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // Simulate API call for bulk recipe upload
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      clearInterval(progressInterval);
      setUploadProgress(100);

      // Simulate upload result
      const result: UploadResult = {
        success: 8,
        failed: 2,
        errors: [
          'Row 5: Missing ingredient "Flour" not found in commissary inventory',
          'Row 12: Invalid quantity format for ingredient "Sugar"'
        ]
      };

      setUploadResult(result);
      toast.success(`Successfully uploaded ${result.success} recipes`);

      if (result.failed > 0) {
        toast.warning(`${result.failed} recipes failed to upload. Check the results below.`);
      }

    } catch (error) {
      toast.error('Failed to upload recipes');
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const downloadTemplate = () => {
    // Create a sample CSV template
    const csvContent = `Recipe Name,Description,Category,Instructions,Ingredient Name,Quantity,Unit,Notes
Chocolate Chip Cookie,Classic chocolate chip cookie,Baked Goods,"Mix dry ingredients. Add wet ingredients. Fold in chocolate chips. Bake at 350°F for 12 minutes.",All-Purpose Flour,2,cups,From commissary inventory
Chocolate Chip Cookie,Classic chocolate chip cookie,Baked Goods,"Mix dry ingredients. Add wet ingredients. Fold in chocolate chips. Bake at 350°F for 12 minutes.",Granulated Sugar,1,cup,From commissary inventory
Chocolate Chip Cookie,Classic chocolate chip cookie,Baked Goods,"Mix dry ingredients. Add wet ingredients. Fold in chocolate chips. Bake at 350°F for 12 minutes.",Chocolate Chips,1,cup,From commissary inventory
Basic Bread,Simple white bread recipe,Bakery,Mix ingredients. Knead. Let rise. Bake at 375°F for 30 minutes.,Bread Flour,3,cups,From commissary inventory
Basic Bread,Simple white bread recipe,Bakery,Mix ingredients. Knead. Let rise. Bake at 375°F for 30 minutes.,Active Dry Yeast,1,packet,From commissary inventory`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'recipe_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Template Download */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Download Template
          </CardTitle>
          <CardDescription>
            Download a CSV template with the correct format for bulk recipe upload
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
            Upload Recipe File
          </CardTitle>
          <CardDescription>
            Upload a CSV or Excel file containing recipe data
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
                <span>Uploading recipes...</span>
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
              <>Uploading...</>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload Recipes
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
                <li>Recipe Name - The name of the recipe</li>
                <li>Description - Brief description of the recipe</li>
                <li>Category - Recipe category (e.g., Baked Goods, Beverages)</li>
                <li>Instructions - Step-by-step cooking instructions</li>
                <li>Ingredient Name - Must match commissary inventory items</li>
                <li>Quantity - Numeric quantity of the ingredient</li>
                <li>Unit - Unit of measurement (cups, grams, etc.)</li>
              </ul>
            </div>
            <div>
              <strong>Important Notes:</strong>
              <ul className="list-disc list-inside ml-4 mt-1">
                <li>Ingredient names must exactly match items in commissary inventory</li>
                <li>Multiple ingredients for the same recipe should be on separate rows</li>
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
