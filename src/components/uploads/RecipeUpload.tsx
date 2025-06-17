import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Download, ChefHat } from "lucide-react";
import { useStore } from "@/contexts/StoreContext";
import { parseRecipesCSV } from "@/utils/csvParser";
import { bulkUploadRecipes } from "@/services/recipeUploadService";
import { toast } from "sonner";
import { StoreSelector } from "./StoreSelector";
import { supabase } from "@/integrations/supabase/client";
import { Store } from "@/types";

export const RecipeUpload = () => {
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedStoreId, setSelectedStoreId] = useState<string>("");
  const [stores, setStores] = useState<Store[]>([]);
  const { currentStore } = useStore();

  useEffect(() => {
    fetchStores();
  }, []);

  useEffect(() => {
    // Set default store when currentStore changes
    if (currentStore && !selectedStoreId) {
      setSelectedStoreId(currentStore.id);
    }
  }, [currentStore, selectedStoreId]);

  const fetchStores = async () => {
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setStores(data || []);
    } catch (error) {
      console.error('Error fetching stores:', error);
      toast.error('Failed to load stores');
    }
  };

  const handleFileUpload = async () => {
    if (!uploadFile) {
      toast.error("Please select a file to upload");
      return;
    }

    if (!selectedStoreId) {
      toast.error("Please select a target store");
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

      if (selectedStoreId === "all") {
        // Upload to all stores
        let totalSuccess = 0;
        let totalFailed = 0;

        for (const store of stores) {
          try {
            const success = await bulkUploadRecipes(recipes, store.id);
            if (success) {
              totalSuccess++;
              toast.success(`Successfully uploaded recipes to ${store.name}`);
            } else {
              totalFailed++;
              toast.error(`Failed to upload recipes to ${store.name}`);
            }
          } catch (error) {
            console.error(`Error uploading to ${store.name}:`, error);
            totalFailed++;
            toast.error(`Failed to upload recipes to ${store.name}`);
          }
        }

        toast.success(`Upload completed: ${totalSuccess} stores successful, ${totalFailed} stores failed`);
      } else {
        // Upload to selected store
        const success = await bulkUploadRecipes(recipes, selectedStoreId);
        if (!success) {
          return;
        }
      }

      setUploadFile(null);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to process upload file");
    } finally {
      setIsUploading(false);
    }
  };

  const downloadTemplate = () => {
    const template = `Name,Category,Ingredient Name,Unit of Measure,Quantity Used,Cost per Unit,Total Cost
Classic - Tiramisu,Classic,Croissant,piece,1,30,
Classic - Tiramisu,Classic,Whipped Cream,serving,1,8,
Classic - Tiramisu,Classic,Tiramisu Sauce,portion,1,3.5,
Classic - Tiramisu,Classic,Choco Flakes,portion,1,2.5,51.3
Classic - Tiramisu,Classic,Take out Box,piece,1,6,
Classic - Tiramisu,Classic,Chopstick,pair,1,0.6,
Classic - Tiramisu,Classic,Waxpaper,piece,1,0.7,
Classic - Choco Nut,Classic,Croissant,piece,1,30,
Classic - Choco Nut,Classic,Whipped Cream,serving,1,8,
Classic - Choco Nut,Classic,Chocolate Sauce,portion,1,2.5,
Classic - Choco Nut,Classic,Peanut,portion,1,2.5,50.3
Classic - Choco Nut,Classic,Take out Box,piece,1,6,
Classic - Choco Nut,Classic,Chopstick,pair,1,0.6,
Classic - Choco Nut,Classic,Waxpaper,piece,1,0.7,
Croffle Overload,Overload,Croissant,piece,0.5,15,
Croffle Overload,Overload,Vanilla Ice Cream,scoop,1,15.44,
Croffle Overload,Overload,Colored Sprinkle,portion,1,2.5,37.74
Croffle Overload,Overload,Peanut,portion,1,2.5,
Croffle Overload,Overload,Choco Flakes,portion,1,2.5,
Croffle Overload,Overload,Marshmallow,portion,1,2.5,
Croffle Overload,Overload,Overload Cup,piece,1,4,
Croffle Overload,Overload,Popsicle,piece,1,0.3,
Croffle Overload,Overload,Spoon,piece,1,0.5,
Mini Croffle,Mini,Croissant,piece,0.5,15,
Mini Croffle,Mini,Whipped Cream,serving,0.5,4,
Mini Croffle,Mini,Chocolate Sauce,portion,1,1.25,21.5
Mini Croffle,Mini,Caramel Sauce,portion,1,1.25,
Mini Croffle,Mini,Colored Sprinkle,portion,1,1.25,
Mini Croffle,Mini,Peanut,portion,1,1.25,
Mini Croffle,Mini,Mini Take out Box,piece,1,2.4,
Mini Croffle,Mini,Popsicle,piece,1,0.3,`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'recipes_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const selectedStoreName = selectedStoreId === "all" 
    ? "All Stores" 
    : stores.find(s => s.id === selectedStoreId)?.name || "Unknown Store";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ChefHat className="h-5 w-5" />
          Upload Recipes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <StoreSelector
          stores={stores}
          selectedStoreId={selectedStoreId}
          onStoreChange={setSelectedStoreId}
          disabled={isUploading}
        />

        {selectedStoreId && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-700">
              <strong>Target:</strong> {selectedStoreName}
            </p>
            {selectedStoreId === "all" && (
              <p className="text-xs text-blue-600 mt-1">
                Recipes will be uploaded to all {stores.length} active stores
              </p>
            )}
          </div>
        )}

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
            disabled={!uploadFile || isUploading || !selectedStoreId}
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
            <li>Required columns: Name, Category, Ingredient Name, Unit of Measure, Quantity Used</li>
            <li>Optional columns: Cost per Unit, Total Cost</li>
            <li>Each row represents one ingredient in a recipe</li>
            <li>Multiple rows with same recipe name will be grouped together</li>
            <li>Category will be used to organize recipes in the POS system</li>
            <li>Ingredient names must match items in commissary inventory</li>
            <li>Total Cost can be calculated automatically if Cost per Unit is provided</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
