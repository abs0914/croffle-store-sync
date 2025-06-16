
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Download, Plus } from "lucide-react";
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
    const template = `name,category,unit,unit_cost,current_stock,minimum_threshold,supplier_name,sku,storage_location
Flour,raw_materials,kg,45.00,100,20,ABC Suppliers,FL001,Dry Storage
Sugar,raw_materials,kg,35.00,50,10,ABC Suppliers,SU001,Dry Storage
Milk,raw_materials,liters,25.00,30,5,Fresh Dairy Co,MK001,Refrigerator
Eggs,raw_materials,pieces,8.00,200,50,Farm Fresh,EG001,Refrigerator`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'raw_ingredients_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Raw Ingredients
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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
            {isUploading ? "Uploading..." : "Upload Ingredients"}
          </Button>
          
          <Button 
            variant="outline" 
            onClick={downloadTemplate}
          >
            <Download className="h-4 w-4 mr-2" />
            Download Template
          </Button>
        </div>

        <div className="text-sm text-muted-foreground">
          <p className="font-medium mb-2">CSV Format Requirements:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Required columns: name, category, unit</li>
            <li>Optional columns: unit_cost, current_stock, minimum_threshold, supplier_name, sku, storage_location</li>
            <li>Category must be: raw_materials, packaging_materials, or supplies</li>
            <li>Unit must be: kg, g, pieces, liters, ml, boxes, packs, serving, portion, scoop, or pair</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
