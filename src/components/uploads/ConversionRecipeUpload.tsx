
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
    const template = `Conversion Name,Description,Input Item Name,Input Quantity,Input Unit,Output Product Name,Output Quantity,Output Unit,Conversion Notes
Cookie Dough to Cookies,Bake cookie dough into finished cookies,Cookie Dough Mix,1,batch,Chocolate Chip Cookies,24,pieces,Bake at 350°F for 12 minutes
Bread Dough to Loaves,Bake bread dough into finished loaves,Bread Dough,2,kg,White Bread Loaves,4,loaves,Bake at 375°F for 30 minutes
Coffee Blend to Brew,Prepare coffee from blend,Premium Coffee Blend,500,g,Brewed Coffee,10,cups,Standard brewing ratio 1:15`;

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
            Each recipe should specify input ingredients and expected output products.
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
            <li>Required columns: Conversion Name, Input Item Name, Input Quantity, Input Unit, Output Product Name, Output Quantity, Output Unit</li>
            <li>Optional columns: Description, Conversion Notes</li>
            <li>Input Item Name must match items in commissary inventory</li>
            <li>Use standard units (kg, g, pieces, liters, ml, etc.)</li>
            <li>Each row represents one conversion recipe</li>
            <li>Templates can be used for inventory preparation processes</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
