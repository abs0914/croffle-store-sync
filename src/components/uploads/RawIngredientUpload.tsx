
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Download, Plus, AlertCircle } from "lucide-react";
import { parseRawIngredientsCSV } from "@/utils/csvParser";
import { bulkUploadRawIngredients } from "@/services/commissaryService";
import { toast } from "sonner";

export const RawIngredientUpload = () => {
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async () => {
    if (!uploadFile) {
      toast.error("Please select a file to upload");
      return;
    }

    setIsUploading(true);
    try {
      const text = await uploadFile.text();
      const ingredients = parseRawIngredientsCSV(text);
      
      if (ingredients.length === 0) {
        toast.error("No valid ingredients found in the file");
        return;
      }

      const success = await bulkUploadRawIngredients(ingredients);
      if (success) {
        setUploadFile(null);
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to process upload file");
    } finally {
      setIsUploading(false);
    }
  };

  const downloadTemplate = () => {
    const template = `name,category,uom,unit_cost,current_stock,minimum_threshold,supplier_name,sku,storage_location
Regular Croissant,raw_materials,1 Box,150.00,10,2,Supplier Name,RAW-CROIS-REG,Cold Storage
Biscoff Crushed,raw_materials,1 Kilo,180.00,5,1,Biscoff Supplier,RAW-BISC-CRUSH,Dry Storage
Biscoff Spread,raw_materials,680 grams,320.00,8,2,Biscoff Supplier,RAW-BISC-SPREAD,Dry Storage
Chocolate Bar Crushed,raw_materials,500 grams,250.00,6,1,Chocolate Co,RAW-CHOC-CRUSH,Dry Storage
Whipped Cream,raw_materials,1 Liter,120.00,15,3,Dairy Co,RAW-CREAM-WHIP,Cold Storage
Croissant Box,packaging_materials,Pack of 50,125.00,20,5,Packaging Co,PKG-CROIS-BOX,Storage Room`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'raw_materials_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Raw Materials & Supplies
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <span className="font-medium text-blue-800">Enhanced CSV Upload</span>
          </div>
          <p className="text-sm text-blue-700">
            This is the primary method for uploading raw materials to the commissary inventory. 
            Supports custom UOM formats like "1 Box", "680 grams", "Pack of 50", etc.
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ingredient-file">CSV File</Label>
            <Input
              id="ingredient-file"
              type="file"
              accept=".csv"
              onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
            />
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={handleFileUpload}
              disabled={!uploadFile || isUploading}
              className="flex-1"
            >
              <Upload className="h-4 w-4 mr-2" />
              {isUploading ? "Uploading..." : "Upload Raw Materials"}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={downloadTemplate}
            >
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </Button>
          </div>
        </div>

        <div className="text-sm text-muted-foreground">
          <p className="font-medium mb-2">CSV Format Requirements:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Required columns: name, category, uom</li>
            <li>Optional columns: unit_cost, current_stock, minimum_threshold, supplier_name, sku, storage_location</li>
            <li>Category must be: raw_materials, packaging_materials, or supplies</li>
            <li>UOM supports custom formats: "1 Box", "1 Kilo", "680 grams", "Pack of 50", etc.</li>
            <li>Storage locations: Cold Storage, Dry Storage, Freezer, Room Temperature, Storage Room</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
