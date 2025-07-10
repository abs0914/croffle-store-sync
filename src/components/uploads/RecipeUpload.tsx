import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Download, ChefHat, Info } from "lucide-react";
import { useStore } from "@/contexts/StoreContext";
import { parseRecipesCSV } from "@/utils/csvParser";
import { bulkUploadRecipes, RecipeUploadData } from "@/services/recipeUploadService";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const RecipeUpload = () => {
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
      const recipes = parseRecipesCSV(text);
      
      if (recipes.length === 0) {
        toast.error("No valid recipes found in the file");
        return;
      }

      // Convert RecipeUpload[] to RecipeUploadData[] ensuring category is present
      const recipeData: RecipeUploadData[] = recipes.map(recipe => ({
        name: recipe.name,
        category: recipe.category || 'Regular', // Ensure category is always present
        ingredients: recipe.ingredients.map(ing => ({
          ingredient_name: ing.commissary_item_name,
          unit: ing.uom,
          quantity: ing.quantity,
          cost_per_unit: ing.cost_per_unit || 0
        }))
      }));

      // Upload recipes as templates (no store ID needed)
      const success = await bulkUploadRecipes(recipeData);
      
      if (success) {
        setUploadFile(null);
        toast.success("Recipe templates created successfully! You can now edit them and deploy to stores.");
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to process upload file");
    } finally {
      setIsUploading(false);
    }
  };

  const downloadCSVTemplate = () => {
    const template = `Name,Category,Ingredient Name,Unit of Measure,Quantity Used,Cost per Unit,Total Cost
Classic - Tiramisu,Regular,Croissant,pieces,1,30,
Classic - Tiramisu,Regular,Whipped Cream,serving,1,8,
Classic - Tiramisu,Regular,Tiramisu Sauce,portion,1,3.5,
Classic - Tiramisu,Regular,Choco Flakes,portion,1,2.5,51.3
Classic - Tiramisu,Regular,Take out Box,pieces,1,6,
Classic - Tiramisu,Regular,Chopstick,pair,1,0.6,
Classic - Tiramisu,Regular,Waxpaper,pieces,1,0.7,
Classic - Choco Nut,Regular,Croissant,pieces,1,30,
Classic - Choco Nut,Regular,Whipped Cream,serving,1,8,
Classic - Choco Nut,Regular,Chocolate Sauce,portion,1,2.5,
Classic - Choco Nut,Regular,Peanut,portion,1,2.5,50.3
Classic - Choco Nut,Regular,Take out Box,pieces,1,6,
Classic - Choco Nut,Regular,Chopstick,pair,1,0.6,
Classic - Choco Nut,Regular,Waxpaper,pieces,1,0.7,
Croffle Overload,Combo,Croissant,pieces,0.5,15,
Croffle Overload,Combo,Vanilla Ice Cream,scoop,1,15.44,
Croffle Overload,Combo,Colored Sprinkle,portion,1,2.5,37.74
Croffle Overload,Combo,Peanut,portion,1,2.5,
Croffle Overload,Combo,Choco Flakes,portion,1,2.5,
Croffle Overload,Combo,Marshmallow,portion,1,2.5,
Croffle Overload,Combo,Overload Cup,pieces,1,4,
Croffle Overload,Combo,Popsicle,pieces,1,0.3,
Croffle Overload,Combo,Spoon,pieces,1,0.5,
Mini Croffle,Regular,Croissant,pieces,0.5,15,
Mini Croffle,Regular,Whipped Cream,serving,0.5,4,
Mini Croffle,Regular,Chocolate Sauce,portion,1,1.25,21.5
Mini Croffle,Regular,Caramel Sauce,portion,1,1.25,
Mini Croffle,Regular,Colored Sprinkle,portion,1,1.25,
Mini Croffle,Regular,Peanut,portion,1,1.25,
Mini Croffle,Regular,Mini Take out Box,pieces,1,2.4,
Mini Croffle,Regular,Popsicle,pieces,1,0.3,
Extra Whipped Cream,Addon,Whipped Cream,serving,1,8,8
Extra Chocolate Sauce,Addon,Chocolate Sauce,portion,1,2.5,2.5
Extra Caramel Sauce,Addon,Caramel Sauce,portion,1,2.5,2.5
Iced Coffee,Beverage,Coffee Beans,grams,15,0.5,
Iced Coffee,Beverage,Ice Cubes,pieces,10,0.1,
Iced Coffee,Beverage,Sugar,grams,5,0.2,8.5
Iced Coffee,Beverage,Milk,ml,50,0.05,
Iced Coffee,Beverage,Plastic Cup,pieces,1,3,
Hot Chocolate,Beverage,Chocolate Powder,grams,25,0.8,
Hot Chocolate,Beverage,Hot Water,ml,200,0.01,
Hot Chocolate,Beverage,Whipped Cream,serving,0.5,4,26
Hot Chocolate,Beverage,Paper Cup,pieces,1,2.5,
Hot Chocolate,Beverage,Cup Sleeve,pieces,1,0.5,`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'comprehensive_recipes_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const downloadJSONTemplate = (type: string) => {
    let template: any = {};
    
    switch(type) {
      case 'regular':
        template = {
          name: "Classic Tiramisu Croffle",
          recipe_type: "regular",
          category: "Regular",
          description: "A delightful combination of crispy croffle with tiramisu flavoring",
          preparation_time: 15,
          serving_size: 1,
          ingredients: [
            {
              ingredient_name: "Croissant",
              unit: "pieces",
              quantity: 1,
              cost_per_unit: 30,
              notes: "Fresh croissant for grilling"
            },
            {
              ingredient_name: "Whipped Cream",
              unit: "serving",
              quantity: 1,
              cost_per_unit: 8,
              notes: "Fresh whipped cream"
            },
            {
              ingredient_name: "Tiramisu Sauce",
              unit: "portion",
              quantity: 1,
              cost_per_unit: 3.5,
              notes: "Signature tiramisu sauce"
            },
            {
              ingredient_name: "Choco Flakes",
              unit: "portion",
              quantity: 1,
              cost_per_unit: 2.5,
              notes: "Chocolate flakes for topping"
            },
            {
              ingredient_name: "Take out Box",
              unit: "pieces",
              quantity: 1,
              cost_per_unit: 6,
              notes: "Packaging"
            }
          ]
        };
        break;
        
      case 'addon':
        template = {
          name: "Extra Whipped Cream",
          recipe_type: "addon",
          category: "Addon",
          description: "Additional whipped cream topping",
          preparation_time: 1,
          serving_size: 1,
          ingredients: [
            {
              ingredient_name: "Whipped Cream",
              unit: "serving",
              quantity: 1,
              cost_per_unit: 8,
              notes: "Extra portion of whipped cream"
            }
          ]
        };
        break;
        
      case 'combo':
        template = {
          name: "Croffle Overload Combo",
          recipe_type: "combo", 
          category: "Combo",
          description: "Ultimate croffle experience with ice cream and toppings",
          preparation_time: 20,
          serving_size: 1,
          ingredients: [
            {
              ingredient_name: "Croissant",
              unit: "pieces",
              quantity: 0.5,
              cost_per_unit: 15,
              notes: "Half croissant for mini size"
            },
            {
              ingredient_name: "Vanilla Ice Cream",
              unit: "scoop",
              quantity: 1,
              cost_per_unit: 15.44,
              notes: "Premium vanilla ice cream"
            },
            {
              ingredient_name: "Colored Sprinkle",
              unit: "portion",
              quantity: 1,
              cost_per_unit: 2.5,
              notes: "Colorful sprinkles"
            },
            {
              ingredient_name: "Peanut",
              unit: "portion",
              quantity: 1,
              cost_per_unit: 2.5,
              notes: "Crushed peanuts"
            },
            {
              ingredient_name: "Overload Cup",
              unit: "pieces",
              quantity: 1,
              cost_per_unit: 4,
              notes: "Special combo cup"
            }
          ]
        };
        break;
        
      case 'beverage':
        template = {
          name: "Iced Coffee Premium",
          recipe_type: "beverage",
          category: "Beverage", 
          description: "Refreshing iced coffee with premium beans",
          preparation_time: 5,
          serving_size: 1,
          ingredients: [
            {
              ingredient_name: "Coffee Beans",
              unit: "grams",
              quantity: 15,
              cost_per_unit: 0.5,
              notes: "Premium coffee beans"
            },
            {
              ingredient_name: "Ice Cubes",
              unit: "pieces",
              quantity: 10,
              cost_per_unit: 0.1,
              notes: "Fresh ice cubes"
            },
            {
              ingredient_name: "Sugar",
              unit: "grams",
              quantity: 5,
              cost_per_unit: 0.2,
              notes: "White sugar"
            },
            {
              ingredient_name: "Milk",
              unit: "ml",
              quantity: 50,
              cost_per_unit: 0.05,
              notes: "Fresh milk"
            },
            {
              ingredient_name: "Plastic Cup",
              unit: "pieces",
              quantity: 1,
              cost_per_unit: 3,
              notes: "16oz plastic cup with lid"
            }
          ]
        };
        break;
    }

    const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}_recipe_template.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ChefHat className="h-5 w-5" />
          Upload Recipe Templates
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Enhanced System:</strong> Upload recipes as centralized templates with proper cost calculations, 
            SKU generation, and robust deployment to stores. All recipe types supported: Regular, Addon, Combo, and Beverage.
          </AlertDescription>
        </Alert>

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
            disabled={!uploadFile || isUploading}
            className="flex-1"
          >
            <Upload className="h-4 w-4 mr-2" />
            {isUploading ? "Creating Templates..." : "Create Recipe Templates"}
          </Button>
        </div>

        <Tabs defaultValue="csv" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="csv">CSV Template</TabsTrigger>
            <TabsTrigger value="json">JSON Templates</TabsTrigger>
          </TabsList>
          
          <TabsContent value="csv" className="space-y-4">
            <Button 
              variant="outline" 
              onClick={downloadCSVTemplate}
              className="w-full"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Comprehensive CSV Template
            </Button>
            
            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-2">CSV Template includes examples for:</p>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Regular Croffles:</strong> Classic Tiramisu, Choco Nut, Mini varieties</li>
                <li><strong>Addon Items:</strong> Extra toppings and sauces</li>
                <li><strong>Combo Packages:</strong> Croffle with ice cream and extras</li>
                <li><strong>Beverages:</strong> Hot and cold drinks</li>
              </ul>
            </div>
          </TabsContent>
          
          <TabsContent value="json" className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => downloadJSONTemplate('regular')}
              >
                <Download className="h-3 w-3 mr-1" />
                Regular Croffle
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => downloadJSONTemplate('addon')}
              >
                <Download className="h-3 w-3 mr-1" />
                Addon Item
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => downloadJSONTemplate('combo')}
              >
                <Download className="h-3 w-3 mr-1" />
                Combo Package
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => downloadJSONTemplate('beverage')}
              >
                <Download className="h-3 w-3 mr-1" />
                Beverage
              </Button>
            </div>
            
            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-2">JSON Templates provide structured examples with:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Proper recipe type classification</li>
                <li>Detailed ingredient specifications</li>
                <li>Cost calculations and serving sizes</li>
                <li>Preparation times and notes</li>
              </ul>
            </div>
          </TabsContent>
        </Tabs>

        <div className="text-sm text-muted-foreground">
          <p className="font-medium mb-2">System Features:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>✅ Automatic cost calculation and validation</li>
            <li>✅ Unique SKU generation per recipe type</li>
            <li>✅ Duplicate deployment detection</li>
            <li>✅ Ingredient inventory matching</li>
            <li>✅ Product creation with proper linking</li>
            <li>✅ Comprehensive error handling and logging</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};