
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RawIngredientUpload } from "@/components/uploads/RawIngredientUpload";
import { RecipeUpload } from "@/components/uploads/RecipeUpload";
import { Button } from "@/components/ui/button";
import { Download, Upload, Package, ChefHat, Factory } from "lucide-react";
import { StoreSelector } from "@/components/uploads/StoreSelector";
import { supabase } from "@/integrations/supabase/client";
import { Store } from "@/types";

interface BulkUploadTabProps {
  storeId: string;
}

export function BulkUploadTab({ storeId }: BulkUploadTabProps) {
  const [activeUploadTab, setActiveUploadTab] = useState("commissary");
  const [selectedStoreId, setSelectedStoreId] = useState<string>(storeId);
  const [stores, setStores] = useState<Store[]>([]);

  useEffect(() => {
    fetchStores();
  }, []);

  useEffect(() => {
    setSelectedStoreId(storeId);
  }, [storeId]);

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
    }
  };

  const handleDownloadTemplate = (type: string) => {
    // Template download logic would go here
    console.log(`Downloading ${type} template`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Bulk Upload</h2>
        <p className="text-muted-foreground">
          Upload inventory items, recipes, and conversion templates in bulk
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Factory className="h-4 w-4" />
              Commissary Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Upload raw materials, packaging, and supplies to commissary inventory
            </p>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => handleDownloadTemplate('commissary')}
              className="w-full"
            >
              <Download className="h-3 w-3 mr-2" />
              Download Template
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4" />
              Conversion Recipes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Upload templates for converting commissary items to store inventory
            </p>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => handleDownloadTemplate('conversion')}
              className="w-full"
            >
              <Download className="h-3 w-3 mr-2" />
              Download Template
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ChefHat className="h-4 w-4" />
              Menu Recipes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Upload recipes using store inventory for menu items
            </p>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => handleDownloadTemplate('menu')}
              className="w-full"
            >
              <Download className="h-3 w-3 mr-2" />
              Download Template
            </Button>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeUploadTab} onValueChange={setActiveUploadTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="commissary" className="flex items-center gap-2">
            <Factory className="h-4 w-4" />
            Commissary
          </TabsTrigger>
          <TabsTrigger value="conversion" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Conversion
          </TabsTrigger>
          <TabsTrigger value="menu" className="flex items-center gap-2">
            <ChefHat className="h-4 w-4" />
            Menu Recipes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="commissary">
          <Card>
            <CardHeader>
              <CardTitle>Upload Commissary Inventory</CardTitle>
            </CardHeader>
            <CardContent>
              <RawIngredientUpload />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conversion">
          <Card>
            <CardHeader>
              <CardTitle>Upload Conversion Recipe Templates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">
                  Conversion recipe bulk upload coming soon
                </p>
                <p className="text-sm text-muted-foreground">
                  For now, create conversion recipes individually in the Conversion Recipes tab
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="menu">
          <Card>
            <CardHeader>
              <CardTitle>Upload Menu Recipes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <StoreSelector
                  stores={stores}
                  selectedStoreId={selectedStoreId}
                  onStoreChange={setSelectedStoreId}
                />
                <RecipeUpload />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
