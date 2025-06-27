
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

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="space-y-2 my-[2px] py-[6px]">
          <Label htmlFor="conversion-file">CSV File</Label>
          <Input
            id="conversion-file"
            type="file"
            accept=".csv"
            onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
          />
        </div>

        <Button
          onClick={handleFileUpload}
          disabled={!uploadFile || isUploading}
          className="w-full"
        >
          <Upload className="h-4 w-4 mr-2" />
          {isUploading ? "Creating Templates..." : "Create Conversion Templates"}
        </Button>

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
