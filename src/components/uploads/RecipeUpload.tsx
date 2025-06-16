
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Download, ChefHat } from "lucide-react";
import { useStore } from "@/contexts/StoreContext";
import { parseRecipesCSV } from "@/utils/csvParser";
import { bulkUploadRecipes } from "@/services/recipeUploadService";
import { toast } from "sonner";

export const RecipeUpload = () => {
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { currentStore } = useStore();

  const handleFileUpload = async () => {
    if (!uploadFile) {
      toast.error("Please select a file to upload");
      return;
    }

    if (!currentStore) {
      toast.error("Please select a store first");
      return;
    }

    setIsUploading(true);
    try {
      const text = await uploadFile.text();
      const recipes = parseRecipesCSV(text);
      
      if (recipes.length === 0) {
        toast.error("No valid recipes found in the file");
        return;
      }

      const success = await bulkUploadRecipes(recipes, currentStore.id);
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
    const template = `recipe_name,description,yield_quantity,serving_size,instructions,ingredient_name,quantity,unit,cost_per_unit
Classic Tiramisu Croffle,Delicious tiramisu flavored croffle,1,1,Mix and cook,Flour,100,g,4.50
Classic Tiramisu Croffle,Delicious tiramisu flavored croffle,1,1,Mix and cook,Sugar,20,g,0.70
Classic Tiramisu Croffle,Delicious tiramisu flavored croffle,1,1,Mix and cook,Milk,50,ml,1.25
Classic Choco Nut Croffle,Rich chocolate and nut croffle,1,1,Mix and cook,Flour,100,g,4.50
Classic Choco Nut Croffle,Rich chocolate and nut croffle,1,1,Mix and cook,Cocoa Powder,15,g,1.80
Classic Choco Nut Croffle,Rich chocolate and nut croffle,1,1,Mix and cook,Nuts,25,g,3.75`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'recipes_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ChefHat className="h-5 w-5" />
          Upload Recipes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="recipe-file">CSV File</Label>
          <Input
            id="recipe-file"
            type="file"
            accept=".csv"
            onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
          />
        </div>

        <div className="flex gap-2">
          <Button 
            onClick={handleFileUpload}
            disabled={!uploadFile || isUploading || !currentStore}
            className="flex-1"
          >
            <Upload className="h-4 w-4 mr-2" />
            {isUploading ? "Uploading..." : "Upload Recipes"}
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
            <li>Required columns: recipe_name, ingredient_name, quantity, unit</li>
            <li>Optional columns: description, yield_quantity, serving_size, instructions, cost_per_unit</li>
            <li>Each row represents one ingredient in a recipe</li>
            <li>Multiple rows with same recipe_name will be grouped together</li>
            <li>Ingredient names must match items in commissary inventory</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
