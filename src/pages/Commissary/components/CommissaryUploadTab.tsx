import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Download, AlertCircle, CheckCircle } from "lucide-react";
import { parseRawIngredientsCSV } from "@/utils/csvParser";
import { bulkUploadRawIngredients } from "@/services/commissaryService";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

export const CommissaryUploadTab = () => {
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadFile(file);
    
    // Parse and preview the file
    try {
      const text = await file.text();
      const ingredients = parseRawIngredientsCSV(text);
      setPreviewData(ingredients.slice(0, 5)); // Show first 5 items as preview
      setShowPreview(true);
    } catch (error) {
      console.error("Error parsing file:", error);
      toast.error("Failed to parse CSV file");
    }
  };

  const handleFileUpload = async () => {
    if (!uploadFile) {
      toast.error("Please select a file to upload");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const text = await uploadFile.text();
      const ingredients = parseRawIngredientsCSV(text);
      
      if (ingredients.length === 0) {
        toast.error("No valid ingredients found in the file");
        return;
      }

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      const success = await bulkUploadRawIngredients(ingredients);
      
      clearInterval(progressInterval);
      setUploadProgress(100);

      if (success) {
        toast.success(`Successfully uploaded ${ingredients.length} commissary items`);
        setUploadFile(null);
        setShowPreview(false);
        setPreviewData([]);
        // Reset file input
        const fileInput = document.getElementById('commissary-file') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to process upload file");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const downloadTemplate = () => {
    const csvContent = `name,category,uom,unit_cost,current_stock,minimum_threshold,supplier_name,sku,storage_location
Flour,raw_materials,1 Kilo,50.00,100,20,ABC Supplies,FL001,Dry Storage
Sugar,raw_materials,680 grams,35.00,50,10,ABC Supplies,SG001,Dry Storage
Eggs,raw_materials,Pack of 30,180.00,20,5,Fresh Foods,EG001,Cold Storage
Plastic Cups,packaging_materials,Pack of 100,150.00,200,50,Packaging Co,PC001,Storage Room
Paper Napkins,supplies,Pack of 500,75.00,100,25,Paper Co,PN001,Storage Room
Croffle Mix,finished_goods,Box,300.00,50,10,Production,CM001,Storage Room`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'commissary_template.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    toast.success("Template downloaded successfully");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Commissary Items
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-medium">CSV Template</h3>
              <p className="text-sm text-muted-foreground">
                Download the template to ensure proper formatting
              </p>
            </div>
            <Button onClick={downloadTemplate} variant="outline" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Download Template
            </Button>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="commissary-file">CSV File</Label>
              <Input 
                id="commissary-file" 
                type="file" 
                accept=".csv" 
                onChange={handleFileSelect}
                disabled={isUploading}
              />
            </div>

            {isUploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="w-full" />
              </div>
            )}

            {showPreview && previewData.length > 0 && (
              <div className="border rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="font-medium">Preview (First 5 items)</span>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  {previewData.map((item, index) => (
                    <div key={index} className="flex gap-4">
                      <span className="font-medium">{item.name}</span>
                      <span>{item.category}</span>
                      <span>{item.uom}</span>
                      {item.unit_cost && <span>₱{item.unit_cost}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button 
              onClick={handleFileUpload} 
              disabled={!uploadFile || isUploading} 
              className="w-full"
            >
              <Upload className="h-4 w-4 mr-2" />
              {isUploading ? "Uploading..." : "Upload Commissary Items"}
            </Button>
          </div>

          <div className="text-sm text-muted-foreground">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">CSV Format Requirements:</span>
            </div>
            <ul className="list-disc list-inside space-y-1 ml-6">
              <li>Required columns: name, category, uom</li>
              <li>Optional columns: unit_cost, current_stock, minimum_threshold, supplier_name, sku, storage_location</li>
              <li>Category must be: raw_materials, packaging_materials, supplies, or finished_goods</li>
              <li>UOM supports all formats including: Box, Piping Bag, Pack of 10, Pack of 20, Pack of 24, Pack of 25, Pack of 27, Pack of 32, Pack of 50, Pack of 100</li>
              <li>Unit cost represents the cost per UOM unit</li>
              <li>Storage locations: Cold Storage, Dry Storage, Freezer, Room Temperature, Storage Room</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};