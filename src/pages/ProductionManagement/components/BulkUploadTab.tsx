
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RawIngredientUpload } from "@/components/uploads/RawIngredientUpload";
import { Button } from "@/components/ui/button";
import { Download, Upload, Package, Factory, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Store } from "@/types";
import { ConversionRecipeUpload } from "@/components/uploads/ConversionRecipeUpload";

interface BulkUploadTabProps {
  storeId: string;
}

export function BulkUploadTab({
  storeId
}: BulkUploadTabProps) {
  const [activeUploadTab, setActiveUploadTab] = useState("commissary");
  const [stores, setStores] = useState<Store[]>([]);

  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('stores').select('*').eq('is_active', true).order('name');
      if (error) throw error;

      // Cast the data to proper Store types
      const typedStores = (data || []).map(store => ({
        ...store,
        ownership_type: store.ownership_type as 'company_owned' | 'franchisee' || 'company_owned',
        franchisee_contact_info: store.franchisee_contact_info ? typeof store.franchisee_contact_info === 'object' ? store.franchisee_contact_info as {
          name?: string;
          email?: string;
          phone?: string;
          address?: string;
        } : {
          name: "",
          email: "",
          phone: "",
          address: ""
        } : undefined
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
        // Updated template with item_price and item_quantity columns
        csvContent = [
          'name,category,uom,unit_cost,item_price,item_quantity,current_stock,minimum_threshold,supplier_name,sku,storage_location',
          'Regular Croissant,raw_materials,1 Box,150.00,12.50,12,10,2,Supplier Name,RAW-CROIS-REG,Cold Storage',
          'Biscoff Crushed,raw_materials,1 Kilo,180.00,180.00,1,5,1,Biscoff Supplier,RAW-BISC-CRUSH,Dry Storage',
          'Biscoff Spread,raw_materials,680 grams,320.00,320.00,1,8,2,Biscoff Supplier,RAW-BISC-SPREAD,Dry Storage',
          'Chocolate Bar Crushed,raw_materials,500 grams,250.00,250.00,1,6,1,Chocolate Co,RAW-CHOC-CRUSH,Dry Storage',
          'Chocolate Chips,raw_materials,1 Kilo,380.00,380.00,1,4,1,Chocolate Co,RAW-CHOC-CHIPS,Dry Storage',
          'Chocolate Syrup,raw_materials,630 grams,200.00,200.00,1,12,3,Chocolate Co,RAW-CHOC-SYR,Dry Storage',
          'Whipped Cream,raw_materials,1 Liter,120.00,120.00,1,15,3,Dairy Co,RAW-CREAM-WHIP,Cold Storage',
          'Ice Cream,raw_materials,2500 grams,280.00,280.00,1,8,2,Dairy Co,RAW-ICECREAM,Freezer',
          'Almonds Crushed,raw_materials,454 grams,420.00,420.00,1,5,1,Nuts Co,RAW-ALMOND-CRUSH,Dry Storage',
          'Almonds Sliced,raw_materials,454 grams,400.00,400.00,1,6,1,Nuts Co,RAW-ALMOND-SLICE,Dry Storage',
          'Peanuts,raw_materials,1 Kilo,180.00,180.00,1,4,1,Nuts Co,RAW-PEANUTS,Dry Storage',
          'Banana,raw_materials,1 Kilo,80.00,80.00,1,20,5,Fresh Fruits,RAW-BANANA,Room Temperature',
          'Strawberry,raw_materials,500 grams,150.00,150.00,1,10,3,Fresh Fruits,RAW-STRAWBERRY,Cold Storage',
          'Caramel Sauce,raw_materials,750 grams,180.00,180.00,1,8,2,Sauce Co,RAW-CARAMEL,Dry Storage',
          'Nutella,raw_materials,900 grams,450.00,450.00,1,6,2,Nutella Co,RAW-NUTELLA,Dry Storage',
          'Peanut Butter,raw_materials,510 grams,220.00,220.00,1,7,2,PB Co,RAW-PB,Dry Storage',
          'Milk,raw_materials,1 Liter,65.00,65.00,1,25,5,Dairy Co,RAW-MILK,Cold Storage',
          'Croissant Box,packaging_materials,Pack of 50,125.00,2.50,50,20,5,Packaging Co,PKG-CROIS-BOX,Storage Room',
          'Food Container Small,packaging_materials,Pack of 100,180.00,1.80,100,15,3,Packaging Co,PKG-CONT-SM,Storage Room',
          'Food Container Large,packaging_materials,Pack of 50,220.00,4.40,50,12,3,Packaging Co,PKG-CONT-LG,Storage Room'
        ].join('\n');
        filename = 'commissary_raw_materials_template.csv';
        break;
      case 'conversion':
        // Updated template to match your conversion spreadsheet format
        csvContent = ['Input Item,Input Qty,Input UOM,Output Item,Output Qty,Output UOM,Notes', 'Croissant Box,1,box,Croissant,12,pieces,Split box into individual croissants', 'Whipped Cream Container,1,container,Whipped Cream Serving,20,servings,Portion into individual servings', 'Cookie Dough Batch,2,kg,Chocolate Chip Cookies,48,pieces,Bake dough into finished cookies', 'Bread Mix,5,kg,Bread Loaves,10,loaves,Mix and bake into finished bread loaves', 'Coffee Beans,1,kg,Ground Coffee,1,kg,Grind beans for brewing'].join('\n');
        filename = 'conversion_recipes_template.csv';
        break;
      default:
        return;
    }
    const blob = new Blob([csvContent], {
      type: 'text/csv'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return <div className="space-y-6">
      <Tabs value={activeUploadTab} onValueChange={setActiveUploadTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="commissary" className="flex items-center gap-2">
            <Factory className="h-4 w-4" />
            Commissary
          </TabsTrigger>
          <TabsTrigger value="conversion" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Conversion
          </TabsTrigger>
        </TabsList>

        <TabsContent value="commissary">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Factory className="h-5 w-5" />
                Upload Raw Materials & Supplies
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
      </Tabs>

      {/* Enhanced Upload Guidelines */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Upload Guidelines & Templates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Factory className="h-4 w-4" />
                Commissary Raw Materials
              </h4>
              <div className="space-y-2 mb-4">
                <Button 
                  onClick={() => handleDownloadTemplate('commissary')}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Raw Materials Template
                </Button>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Raw materials, packaging, supplies</li>
                <li>• Support for custom UOM (1 Box, 1 Kilo, 680 grams, etc.)</li>
                <li>• Include supplier information</li>
                <li>• Set proper stock thresholds</li>
                <li>• Specify storage locations</li>
                <li>• Item price and quantity for unit calculations</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Package className="h-4 w-4" />
                Conversion Recipes
              </h4>
              <div className="space-y-2 mb-4">
                <Button 
                  onClick={() => handleDownloadTemplate('conversion')}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Conversion Template
                </Button>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Transform commissary items to products</li>
                <li>• Include input/output quantities</li>
                <li>• Add conversion instructions</li>
                <li>• Specify yield information</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>;
}
