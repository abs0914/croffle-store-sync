
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RawIngredientUpload } from "@/components/uploads/RawIngredientUpload";
import { RecipeUpload } from "@/components/uploads/RecipeUpload";
import { Upload, Package, ChefHat } from "lucide-react";

export default function BulkUpload() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Upload className="h-8 w-8" />
            Bulk Upload
          </h1>
          <p className="text-muted-foreground">
            Upload raw ingredients and recipes in bulk using CSV files
          </p>
        </div>
      </div>

      <Tabs defaultValue="ingredients" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="ingredients" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Raw Ingredients
          </TabsTrigger>
          <TabsTrigger value="recipes" className="flex items-center gap-2">
            <ChefHat className="h-4 w-4" />
            Recipes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ingredients">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Raw Ingredients Upload</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Upload your raw materials, packaging materials, and supplies inventory. 
                  These items will be available for use in recipes and can be managed in the commissary inventory.
                </p>
              </CardContent>
            </Card>
            <RawIngredientUpload />
          </div>
        </TabsContent>

        <TabsContent value="recipes">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Recipe Upload</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Upload complete recipes with ingredient lists and costs. 
                  Make sure all ingredients exist in your commissary inventory first.
                </p>
              </CardContent>
            </Card>
            <RecipeUpload />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
