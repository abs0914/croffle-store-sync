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
    const csvContent = `Category,ITEMS,Price,Unit,location
Croffle Items,REGULAR CROISSANT,2100.00,1 Box/70pcs.,FRANCHISEE OUTSIDE CEBU
SAUCES,Nutella,90.00,Pack of 20,FRANCHISEE OUTSIDE CEBU
TOPPINGS,Biscoff,180.00,Pack of 32,FRANCHISEE OUTSIDE CEBU
BOXES,Rectangle,65.00,Packs of 25,FRANCHISEE OUTSIDE CEBU
MISCELLANEOUS,Chopstick,60.00,Pack of 100,FRANCHISEE OUTSIDE CEBU
EQUIPMENT and SUPPLIES,Waffle Maker,6500.00,Per machine,FRANCHISEE OUTSIDE CEBU
Coffee Items,Coffee Beans,1040.00,1kg,FRANCHISEE OUTSIDE CEBU`;

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
              <li>Required columns: <strong>Category</strong>, <strong>ITEMS</strong> (name), <strong>Price</strong> (unit_cost), <strong>Unit</strong> (uom), <strong>location</strong></li>
              <li>Category examples: Croffle Items, SAUCES, TOPPINGS, BOXES, MISCELLANEOUS, EQUIPMENT and SUPPLIES, Coffee Items</li>
              <li>Categories are automatically mapped to database types (raw_materials, packaging_materials, supplies)</li>
              <li>UOM supports all formats: 1 Box/70pcs., Pack of 20, Pack of 32, 1 liter, 250g, Per piece, etc.</li>
              <li>Price represents the cost per unit</li>
              <li>Location examples: FRANCHISEE OUTSIDE CEBU, FRANCHISEE CEBU, BRANCHES, or custom storage locations</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};