
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
        csvContent = ['name,category,unit,unit_cost,current_stock,minimum_threshold,supplier_name,sku,storage_location', 'All-Purpose Flour,raw_materials,kg,0.50,100,20,Flour Supplier Inc,FL001,Storage Room A', 'Vanilla Extract,raw_materials,ml,0.25,50,10,Flavor Co,VE001,Storage Room B', 'Food Grade Boxes,packaging_materials,pieces,0.15,200,50,Package Pro,BOX001,Storage Room C'].join('\n');
        filename = 'commissary_inventory_template.csv';
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

      {/* Upload Guidelines */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Upload Guidelines
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
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
          </div>
        </CardContent>
      </Card>
    </div>;
}
