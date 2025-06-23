
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Download, Package, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { parseConversionRecipesCSV } from "@/utils/csvParser";
import { bulkUploadConversionRecipes } from "@/services/conversionRecipeUploadService";

export const ConversionRecipeUpload = () => {
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
      const conversionRecipes = parseConversionRecipesCSV(text);
      
      if (conversionRecipes.length === 0) {
        toast.error("No valid conversion recipes found in the file");
        return;
      }

      const success = await bulkUploadConversionRecipes(conversionRecipes);
      
      if (success) {
        setUploadFile(null);
        toast.success(`Successfully created ${conversionRecipes.length} conversion recipe templates`);
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to process upload file");
    } finally {
      setIsUploading(false);
    }
  };

  const downloadTemplate = () => {
    // Updated template to match your conversion spreadsheet format
    const template = `Input Item,Input Qty,Input UOM,Output Item,Output Qty,Output UOM,Notes
Croissant Box,1,box,Croissant,12,pieces,Split box into individual croissants
Whipped Cream Container,1,container,Whipped Cream Serving,20,servings,Portion into individual servings
Cookie Dough Batch,2,kg,Chocolate Chip Cookies,48,pieces,Bake dough into finished cookies
Bread Mix,5,kg,Bread Loaves,10,loaves,Mix and bake into finished bread loaves
Coffee Beans,1,kg,Ground Coffee,1,kg,Grind beans for brewing`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'conversion_recipes_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Upload Conversion Recipe Templates
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Upload conversion recipe templates that define how commissary items are transformed into store inventory products.
            Each recipe should specify input ingredients and expected output products with quantities and units.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="conversion-file">CSV File</Label>
          <Input
            id="conversion-file"
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
            {isUploading ? "Creating Templates..." : "Create Conversion Templates"}
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
            <li>Required columns: Input Item, Input Qty, Input UOM, Output Item, Output Qty, Output UOM</li>
            <li>Optional columns: Notes (for conversion instructions)</li>
            <li>Input Item must match items in commissary inventory exactly</li>
            <li>Use standard units (kg, g, pieces, liters, ml, box, container, etc.)</li>
            <li>Each row represents one conversion recipe</li>
            <li>Templates can be used for inventory preparation processes</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
