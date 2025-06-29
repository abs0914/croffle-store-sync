
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

  const downloadTemplate = () => {
    // Create template using actual commissary inventory items
    let csvContent = `Conversion Name,Input Item,Input Qty,Input UOM,Output Item,Output Qty,Output UOM,Notes\n`;
    
    if (commissaryItems.length > 0) {
      // Use first few items as examples
      const sampleItems = commissaryItems.slice(0, 3);
      
      sampleItems.forEach((item, index) => {
        const conversionName = `${item.name} Processing ${index + 1}`;
        const outputName = `Processed ${item.name}`;
        csvContent += `${conversionName},${item.name},1,${item.uom},${outputName},5,pieces,Convert ${item.name} into processed units\n`;
      });
    } else {
      // Fallback if no items loaded
      csvContent += `Sample Conversion,Raw Material Name,1,kg,Finished Product Name,10,pieces,Sample conversion process\n`;
      csvContent += `Bulk to Individual,Bulk Item Name,1,box,Individual Item Name,24,pieces,Breaking down bulk items\n`;
    }

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'conversion_recipe_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Important:</strong> Input items must match items in your commissary inventory. 
            Items not found will be skipped with a warning. Use the template below with your actual inventory items.
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
                    {item.name} ({item.uom})
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No items found in commissary inventory</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Button
            onClick={downloadTemplate}
            variant="outline"
            className="w-full"
            disabled={isLoadingItems}
          >
            <Download className="h-4 w-4 mr-2" />
            Download CSV Template (Using Your Inventory)
          </Button>
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
          <p className="font-medium mb-2">CSV Format Requirements:</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Required columns:</strong> Conversion Name, Input Item, Input Qty, Input UOM, Output Item, Output Qty, Output UOM</li>
            <li><strong>Optional columns:</strong> Notes (for conversion instructions)</li>
            <li><strong>Important:</strong> Input items must match commissary inventory items exactly (case-sensitive)</li>
            <li><strong>Missing ingredients:</strong> Will be skipped with a warning - conversion recipes can still be created</li>
            <li>Copy item names from the "Available Commissary Items" list above</li>
            <li>Use standard units (kg, g, pieces, liters, ml, box, container, etc.)</li>
            <li>Each row represents one conversion recipe</li>
            <li>Templates can be used for inventory preparation processes</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
