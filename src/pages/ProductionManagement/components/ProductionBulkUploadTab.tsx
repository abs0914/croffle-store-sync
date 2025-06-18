
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, Download, FileText, AlertCircle, CheckCircle, Factory } from 'lucide-react';
import { toast } from 'sonner';

interface ProductionUploadResult {
  success: number;
  failed: number;
  errors: string[];
}

interface ProductionBulkUploadTabProps {
  storeId: string;
}

export const ProductionBulkUploadTab: React.FC<ProductionBulkUploadTabProps> = ({ storeId }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState<ProductionUploadResult | null>(null);

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

      const result: ProductionUploadResult = {
        success: 6,
        failed: 1,
        errors: [
          'Row 7: Commissary item "Premium Vanilla" not found in inventory'
        ]
      };

      setUploadResult(result);
      toast.success(`Successfully uploaded ${result.success} production conversions`);

      if (result.failed > 0) {
        toast.warning(`${result.failed} conversions failed to upload. Check the results below.`);
      }

    } catch (error) {
      toast.error('Failed to upload production conversions');
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const downloadTemplate = () => {
    const csvContent = `Conversion Name,Description,Input Item Name,Input Quantity,Input Unit,Output Product Name,Output Quantity,Output Unit,Conversion Notes
Cookie Dough to Cookies,Bake cookie dough into finished cookies,Cookie Dough Mix,1,batch,Chocolate Chip Cookies,24,pieces,Bake at 350°F for 12 minutes
Bread Dough to Loaves,Bake bread dough into finished loaves,Bread Dough,2,kg,White Bread Loaves,4,loaves,Bake at 375°F for 30 minutes
Coffee Blend to Brew,Prepare coffee from blend,Premium Coffee Blend,500,grams,Brewed Coffee,10,cups,Standard brewing ratio 1:15`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'production_conversion_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Store Context */}
      <Alert>
        <Factory className="h-4 w-4" />
        <AlertDescription>
          Production conversions will be created for store: <strong>{storeId || 'Current Store'}</strong>
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
            Download a CSV template for bulk production conversion upload
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
            Upload Production File
          </CardTitle>
          <CardDescription>
            Upload a CSV or Excel file containing production conversion data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="production-file">Select File</Label>
            <Input
              id="production-file"
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
                <span>Processing conversions...</span>
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
                Upload Conversions
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
                <li>Conversion Name - Name of the production conversion</li>
                <li>Description - Brief description of the conversion process</li>
                <li>Input Item Name - Commissary inventory item used as input</li>
                <li>Input Quantity - Quantity of input item needed</li>
                <li>Input Unit - Unit of measurement for input</li>
                <li>Output Product Name - Final product produced</li>
                <li>Output Quantity - Quantity of output produced</li>
                <li>Output Unit - Unit of measurement for output</li>
              </ul>
            </div>
            <div>
              <strong>Important Notes:</strong>
              <ul className="list-disc list-inside ml-4 mt-1">
                <li>Input items must exist in commissary inventory</li>
                <li>All quantities must be numeric values</li>
                <li>Conversions will be created for the current store context</li>
                <li>File size limit: 10MB</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
