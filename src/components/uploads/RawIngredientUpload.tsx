import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, AlertCircle } from "lucide-react";
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
  return <Card>
      <CardHeader>
        
      </CardHeader>
      <CardContent className="space-y-6">
        

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ingredient-file">CSV File</Label>
            <Input id="ingredient-file" type="file" accept=".csv" onChange={e => setUploadFile(e.target.files?.[0] || null)} />
          </div>

          <Button onClick={handleFileUpload} disabled={!uploadFile || isUploading} className="w-full">
            <Upload className="h-4 w-4 mr-2" />
            {isUploading ? "Uploading..." : "Upload Raw Materials"}
          </Button>
        </div>

        <div className="text-sm text-muted-foreground">
          <p className="font-medium mb-2">CSV Format Requirements:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Required columns: name, category, uom</li>
            <li>Optional columns: unit_cost, item_price, item_quantity, current_stock, minimum_threshold, supplier_name, sku, storage_location</li>
            <li>Category must be: raw_materials, packaging_materials, or supplies</li>
            <li>UOM supports custom formats: "1 Box", "1 Kilo", "680 grams", "Pack of 50", etc.</li>
            <li>Unit cost calculation: unit_cost = item_price ÷ item_quantity (when both provided)</li>
            <li>Storage locations: Cold Storage, Dry Storage, Freezer, Room Temperature, Storage Room</li>
          </ul>
        </div>
      </CardContent>
    </Card>;
};