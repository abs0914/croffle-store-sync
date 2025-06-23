import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RawIngredientUpload } from "@/components/uploads/RawIngredientUpload";
import { RecipeUpload } from "@/components/uploads/RecipeUpload";
import { Button } from "@/components/ui/button";
import { Download, Upload, Package, ChefHat, Factory, FileText, Building2 } from "lucide-react";
import { StoreSelector } from "@/components/uploads/StoreSelector";
import { supabase } from "@/integrations/supabase/client";
import { Store } from "@/types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ConversionRecipeUpload } from "@/components/uploads/ConversionRecipeUpload";

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
      
      // Cast the data to proper Store types
      const typedStores = (data || []).map(store => ({
        ...store,
        ownership_type: (store.ownership_type as 'company_owned' | 'franchisee') || 'company_owned',
        franchisee_contact_info: store.franchisee_contact_info ? 
          (typeof store.franchisee_contact_info === 'object' ? 
            store.franchisee_contact_info as { name?: string; email?: string; phone?: string; address?: string; } : 
            { name: "", email: "", phone: "", address: "" }
          ) : undefined
      })) as Store[];
      
      setStores(typedStores);
    } catch (error) {
      console.error('Error fetching stores:', error);
    }
  };

  const handleDownloadTemplate = (type: string) => {
    let csvContent = '';
    let filename = '';

    switch (type) {
      case 'commissary':
        csvContent = [
          'name,category,unit,unit_cost,current_stock,minimum_threshold,supplier_name,sku,storage_location',
          'All-Purpose Flour,raw_materials,kg,0.50,100,20,Flour Supplier Inc,FL001,Storage Room A',
          'Vanilla Extract,raw_materials,ml,0.25,50,10,Flavor Co,VE001,Storage Room B',
          'Food Grade Boxes,packaging_materials,pieces,0.15,200,50,Package Pro,BOX001,Storage Room C'
        ].join('\n');
        filename = 'commissary_inventory_template.csv';
        break;

      case 'conversion':
        // Updated template to match your conversion spreadsheet format
        csvContent = [
          'Input Item,Input Qty,Input UOM,Output Item,Output Qty,Output UOM,Notes',
          'Croissant Box,1,box,Croissant,12,pieces,Split box into individual croissants',
          'Whipped Cream Container,1,container,Whipped Cream Serving,20,servings,Portion into individual servings',
          'Cookie Dough Batch,2,kg,Chocolate Chip Cookies,48,pieces,Bake dough into finished cookies',
          'Bread Mix,5,kg,Bread Loaves,10,loaves,Mix and bake into finished bread loaves',
          'Coffee Beans,1,kg,Ground Coffee,1,kg,Grind beans for brewing'
        ].join('\n');
        filename = 'conversion_recipes_template.csv';
        break;

      case 'menu':
        csvContent = [
          'name,category,description,yield_quantity,serving_size,instructions,ingredient name,quantity used,unit of measure,cost per unit',
          'Chocolate Chip Cookies,Desserts,Classic chocolate chip cookies,24,1,Mix dry ingredients then add wet ingredients,All-Purpose Flour,2,kg,0.50',
          'Chocolate Chip Cookies,,,,,,,Chocolate Chips,0.5,kg,8.50',
          'Chocolate Chip Cookies,,,,,,,Sugar,0.3,kg,1.20',
          'Vanilla Cake,Cakes,Moist vanilla cake perfect for celebrations,1,8,Cream butter and sugar then alternate dry and wet ingredients,All-Purpose Flour,1.5,kg,0.50',
          'Vanilla Cake,,,,,,,Vanilla Extract,50,ml,0.25'
        ].join('\n');
        filename = 'menu_recipes_template.csv';
        break;

      default:
        return;
    }

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Bulk Upload Center</h2>
        <p className="text-muted-foreground">
          Upload inventory items, recipes, and conversion templates in bulk to streamline your operations
        </p>
      </div>

      <Alert>
        <Building2 className="h-4 w-4" />
        <AlertDescription>
          <strong>Upload Context:</strong> Commissary items and conversions are global. Menu recipes will be uploaded to the selected store.
        </AlertDescription>
      </Alert>

      {/* Quick Template Downloads */}
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
              <CardTitle className="flex items-center gap-2">
                <Factory className="h-5 w-5" />
                Upload Commissary Inventory
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RawIngredientUpload />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conversion">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Upload Conversion Recipe Templates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ConversionRecipeUpload />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="menu">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ChefHat className="h-5 w-5" />
                Upload Menu Recipes
              </CardTitle>
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

      {/* Upload Guidelines */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Upload Guidelines
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <h4 className="font-medium mb-2">Commissary Items</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Raw materials, packaging, supplies</li>
                <li>• Include supplier information</li>
                <li>• Set proper stock thresholds</li>
                <li>• Use standard units (kg, g, pieces, etc.)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Conversion Recipes</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Transform commissary items to products</li>
                <li>• Include input/output quantities</li>
                <li>• Add conversion instructions</li>
                <li>• Specify yield information</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Menu Recipes</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Use store inventory ingredients</li>
                <li>• Include detailed instructions</li>
                <li>• Specify serving sizes</li>
                <li>• Assign to proper categories</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
