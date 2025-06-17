
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
    const template = `Name,Ingredient Name,Unit of Measure,Quantity Used,Cost per Unit,Total Cost
Classic - Tiramisu,Croissant,piece,1,30,
Classic - Tiramisu,Whipped Cream,serving,1,8,
Classic - Tiramisu,Tiramisu Sauce,portion,1,3.5,
Classic - Tiramisu,Choco Flakes,portion,1,2.5,51.3
Classic - Tiramisu,Take out Box,piece,1,6,
Classic - Tiramisu,Chopstick,pair,1,0.6,
Classic - Tiramisu,Waxpaper,piece,1,0.7,
Classic - Choco Nut,Croissant,piece,1,30,
Classic - Choco Nut,Whipped Cream,serving,1,8,
Classic - Choco Nut,Chocolate Sauce,portion,1,2.5,
Classic - Choco Nut,Peanut,portion,1,2.5,50.3
Classic - Choco Nut,Take out Box,piece,1,6,
Classic - Choco Nut,Chopstick,pair,1,0.6,
Classic - Choco Nut,Waxpaper,piece,1,0.7,
Croffle Overload,Croissant,piece,0.5,15,
Croffle Overload,Vanilla Ice Cream,scoop,1,15.44,
Croffle Overload,Colored Sprinkle,portion,1,2.5,37.74
Croffle Overload,Peanut,portion,1,2.5,
Croffle Overload,Choco Flakes,portion,1,2.5,
Croffle Overload,Marshmallow,portion,1,2.5,
Croffle Overload,Overload Cup,piece,1,4,
Croffle Overload,Popsicle,piece,1,0.3,
Croffle Overload,Spoon,piece,1,0.5,
Mini Croffle,Croissant,piece,0.5,15,
Mini Croffle,Whipped Cream,serving,0.5,4,
Mini Croffle,Chocolate Sauce,portion,1,1.25,21.5
Mini Croffle,Caramel Sauce,portion,1,1.25,
Mini Croffle,Colored Sprinkle,portion,1,1.25,
Mini Croffle,Peanut,portion,1,1.25,
Mini Croffle,Mini Take out Box,piece,1,2.4,
Mini Croffle,Popsicle,piece,1,0.3,`;

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
            <li>Required columns: Name, Ingredient Name, Unit of Measure, Quantity Used</li>
            <li>Optional columns: Cost per Unit, Total Cost</li>
            <li>Each row represents one ingredient in a recipe</li>
            <li>Multiple rows with same recipe name will be grouped together</li>
            <li>Ingredient names must match items in commissary inventory</li>
            <li>Total Cost can be calculated automatically if Cost per Unit is provided</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
