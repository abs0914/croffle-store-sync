
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Download, Package, Info, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { parseConversionRecipesCSV } from "@/utils/conversionRecipeParser";
import { bulkUploadConversionRecipes } from "@/services/conversionRecipeUploadService";
import { fetchCommissaryInventory } from "@/services/inventoryManagement/commissaryInventoryService";
import { CommissaryInventoryItem } from "@/types/commissary";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const ConversionRecipeUpload = () => {
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [commissaryItems, setCommissaryItems] = useState<CommissaryInventoryItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);

  useEffect(() => {
    fetchCommissaryItems();
  }, []);

  const fetchCommissaryItems = async () => {
    setIsLoadingItems(true);
    try {
      const items = await fetchCommissaryInventory();
      setCommissaryItems(items);
    } catch (error) {
      console.error('Error fetching commissary items:', error);
      toast.error('Failed to load commissary inventory items');
    } finally {
      setIsLoadingItems(false);
    }
  };

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

  const downloadSingleIngredientTemplate = () => {
    let csvContent = `Conversion Name,Input Item,Input Qty,Input UOM,Output Item,Output Qty,Output UOM,Output Unit Cost,Output SKU,Notes\n`;
    
    if (commissaryItems.length > 0) {
      const sampleItems = commissaryItems.slice(0, 3);
      
      sampleItems.forEach((item, index) => {
        const conversionName = `${item.name} Processing ${index + 1}`;
        const outputName = `Processed ${item.name}`;
        const outputUnitCost = item.unit_cost ? (item.unit_cost * 1.2).toFixed(2) : '50.00'; // 20% markup or default
        const outputSKU = `FP-${outputName.toUpperCase().replace(/\s+/g, '-').substring(0, 15)}`;
        csvContent += `${conversionName},${item.name},1,${item.unit},${outputName},5,pieces,${outputUnitCost},${outputSKU},Convert ${item.name} into processed units\n`;
      });
    } else {
      csvContent += `Sample Conversion,Raw Material Name,1,kg,Finished Product Name,10,pieces,100.00,FP-FINISHED-PRODUCT,Sample conversion process\n`;
    }

    downloadCSV(csvContent, 'single_ingredient_conversion_template.csv');
  };

  const downloadMultiIngredientTemplate = () => {
    let csvContent = `Conversion Name,Input Items,Input Quantities,Input UOMs,Output Item,Output Qty,Output UOM,Output Unit Cost,Output SKU,Notes\n`;
    
    if (commissaryItems.length >= 2) {
      const items = commissaryItems.slice(0, 2);
      const inputItems = items.map(item => item.name).join('|');
      const inputQtys = items.map(() => '1').join('|');
      const inputUOMs = items.map(item => item.unit).join('|');
      const totalInputCost = items.reduce((sum, item) => sum + (item.unit_cost || 0), 0);
      const outputUnitCost = (totalInputCost * 1.3).toFixed(2); // 30% markup
      const outputSKU = `FP-COMBO-${items[0].name.substring(0, 8).toUpperCase()}`;
      
      csvContent += `Multi-Ingredient Combo,${inputItems},${inputQtys},${inputUOMs},Combined Product,1,combo,${outputUnitCost},${outputSKU},Multi-ingredient conversion\n`;
    } else {
      csvContent += `Croissant + Cream Combo,"Croissant Box|Whipped Cream Container","1|7","box|pieces",Regular Croissant + Whipped Cream,1,combo,2660.00,FP-CROIS-CREAM,Multi-ingredient combo\n`;
    }

    csvContent += `Whipped Cream Mix + Monalisa,"Whipped Cream Mix|Monalisa Cream","12|12","bags|liters",Premium Whipped Cream,12,piping bags,3360.00,FP-PREM-CREAM,Premium cream mixture\n`;
    
    downloadCSV(csvContent, 'multi_ingredient_conversion_template.csv');
  };

  const downloadMultiRowTemplate = () => {
    let csvContent = `Conversion Name,Input Item,Input Qty,Input UOM,Output Item,Output Qty,Output UOM,Output Unit Cost,Output SKU,Notes\n`;
    
    if (commissaryItems.length >= 2) {
      const items = commissaryItems.slice(0, 2);
      const outputName = `${items[0].name} + ${items[1].name} Combo`;
      const totalInputCost = items.reduce((sum, item) => sum + (item.unit_cost || 0), 0);
      const outputUnitCost = (totalInputCost * 1.3).toFixed(2); // 30% markup
      const outputSKU = `FP-COMBO-${items[0].name.substring(0, 8).toUpperCase()}`;
      
      items.forEach((item, index) => {
        csvContent += `Multi-Row Combo,${item.name},${index === 0 ? '1' : '7'},${item.unit},${outputName},1,combo,${outputUnitCost},${outputSKU},Multi-ingredient via multiple rows\n`;
      });
    } else {
      csvContent += `Croissant + Cream Combo,Croissant Box,1,box,Regular Croissant + Whipped Cream,1,combo,2660.00,FP-CROIS-CREAM,Multi-ingredient combo\n`;
      csvContent += `Croissant + Cream Combo,Whipped Cream Container,7,pieces,Regular Croissant + Whipped Cream,1,combo,2660.00,FP-CROIS-CREAM,Multi-ingredient combo\n`;
    }
    
    downloadCSV(csvContent, 'multi_row_conversion_template.csv');
  };

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Multi-Ingredient Support:</strong> This system now supports both single and multi-ingredient conversion recipes. 
            Use the templates below to see different formats for creating complex products like "Croissant + Whipped Cream".
          </AlertDescription>
        </Alert>

        {/* Available Items Display */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Available Commissary Items ({commissaryItems.length})</Label>
            <Button
              onClick={fetchCommissaryItems}
              variant="outline"
              size="sm"
              disabled={isLoadingItems}
            >
              {isLoadingItems ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Refresh
            </Button>
          </div>
          
          <div className="max-h-32 overflow-y-auto border rounded-md p-2 bg-muted/20">
            {isLoadingItems ? (
              <p className="text-sm text-muted-foreground">Loading items...</p>
            ) : commissaryItems.length > 0 ? (
              <div className="grid grid-cols-2 gap-1 text-xs">
                {commissaryItems.map((item) => (
                  <div key={item.id} className="truncate">
                    {item.name} ({item.unit})
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No items found in commissary inventory</p>
            )}
          </div>
        </div>

        {/* Template Downloads */}
        <div className="space-y-4">
          <Label className="text-base font-medium">CSV Templates</Label>
          
          <Tabs defaultValue="single" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="single">Single Ingredient</TabsTrigger>
              <TabsTrigger value="multi-pipe">Multi (Pipe-Separated)</TabsTrigger>
              <TabsTrigger value="multi-row">Multi (Multiple Rows)</TabsTrigger>
            </TabsList>
            
            <TabsContent value="single" className="space-y-2">
              <p className="text-sm text-muted-foreground">For simple 1-to-1 conversions</p>
              <Button
                onClick={downloadSingleIngredientTemplate}
                variant="outline"
                className="w-full"
                disabled={isLoadingItems}
              >
                <Download className="h-4 w-4 mr-2" />
                Download Single Ingredient Template
              </Button>
            </TabsContent>
            
            <TabsContent value="multi-pipe" className="space-y-2">
              <p className="text-sm text-muted-foreground">Multiple ingredients in one row, separated by pipes (|)</p>
              <Button
                onClick={downloadMultiIngredientTemplate}
                variant="outline"
                className="w-full"
                disabled={isLoadingItems}
              >
                <Download className="h-4 w-4 mr-2" />
                Download Multi-Ingredient Template (Pipe-Separated)
              </Button>
            </TabsContent>
            
            <TabsContent value="multi-row" className="space-y-2">
              <p className="text-sm text-muted-foreground">Multiple ingredients using separate rows with same conversion name</p>
              <Button
                onClick={downloadMultiRowTemplate}
                variant="outline"
                className="w-full"
                disabled={isLoadingItems}
              >
                <Download className="h-4 w-4 mr-2" />
                Download Multi-Ingredient Template (Multiple Rows)
              </Button>
            </TabsContent>
          </Tabs>
        </div>

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
          {isUploading ? "Creating Templates..." : "Create Orderable Product (Conversion)"}
        </Button>

        <div className="text-sm text-muted-foreground">
          <p className="font-medium mb-2">Multi-Ingredient CSV Format Options:</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Pipe-Separated Format:</strong> Use "Input Items", "Input Quantities", "Input UOMs" columns with values separated by "|"</li>
            <li><strong>Multi-Row Format:</strong> Use multiple rows with the same "Conversion Name" for different ingredients</li>
            <li><strong>Required columns:</strong> Conversion Name, Output Item, Output Qty, Output UOM, Output Unit Cost, Output SKU</li>
            <li><strong>Input validation:</strong> All input items must exist in commissary inventory</li>
            <li><strong>Example multi-ingredient:</strong> "Croissant Box|Whipped Cream" becomes "Regular Croissant + Whipped Cream"</li>
            <li>Copy exact item names from the "Available Commissary Items" list above</li>
            <li>Use standard units (kg, g, pieces, liters, ml, box, container, etc.)</li>
            <li><strong>Output Unit Cost:</strong> Set the selling price/cost per unit for the finished product</li>
            <li><strong>Output SKU:</strong> Unique identifier for the finished product (e.g., FP-PRODUCT-NAME)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
