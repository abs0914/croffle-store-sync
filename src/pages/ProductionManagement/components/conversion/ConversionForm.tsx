import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, RefreshCw, ArrowRight } from "lucide-react";
import { CommissaryInventoryItem, ConversionRequest } from "@/types/commissary";
import { executeConversion } from "@/services/conversion";
import { toast } from "sonner";
import { ConversionBasicInfo } from "./ConversionBasicInfo";
import { ConversionInputItems } from "./ConversionInputItems";
import { ConversionOutputItem } from "./ConversionOutputItem";
interface ConversionFormProps {
  rawMaterials: CommissaryInventoryItem[];
  onConversionComplete: () => void;
}
export function ConversionForm({
  rawMaterials,
  onConversionComplete
}: ConversionFormProps) {
  const [converting, setConverting] = useState(false);

  // Form state
  const [conversionName, setConversionName] = useState("");
  const [description, setDescription] = useState("");
  const [inputItems, setInputItems] = useState<{
    commissary_item_id: string;
    quantity: number;
    unit: string;
  }[]>([{
    commissary_item_id: "",
    quantity: 1,
    unit: "pieces"
  }]);
  const [outputItem, setOutputItem] = useState({
    name: "",
    category: "supplies" as const,
    uom: "pieces",
    // Default to a standard unit
    quantity: 1,
    unit_cost: 0,
    sku: "",
    storage_location: ""
  });
  const resetForm = () => {
    setConversionName("");
    setDescription("");
    setInputItems([{
      commissary_item_id: "",
      quantity: 1,
      unit: "pieces"
    }]);
    setOutputItem({
      name: "",
      category: "supplies",
      uom: "pieces",
      quantity: 1,
      unit_cost: 0,
      sku: "",
      storage_location: ""
    });
  };
  const handleConversion = async () => {
    if (!conversionName.trim()) {
      toast.error("Please enter a repackaging process name");
      return;
    }
    if (!outputItem.name.trim()) {
      toast.error("Please enter a repackaged item name");
      return;
    }
    if (!outputItem.uom) {
      toast.error("Please select a unit of measure for the repackaged items");
      return;
    }
    const validInputItems = inputItems.filter(item => item.commissary_item_id && item.quantity > 0);
    if (validInputItems.length === 0) {
      toast.error("Please select at least one bulk item with valid quantity");
      return;
    }

    // Ensure all input items have the unit property filled
    const inputItemsWithUnits = validInputItems.map(item => {
      const rawMaterial = rawMaterials.find(rm => rm.id === item.commissary_item_id);
      return {
        ...item,
        unit: rawMaterial?.uom || item.unit || "pieces"
      };
    });

    // Calculate unit cost if not provided
    const calculatedUnitCost = outputItem.unit_cost || (() => {
      const totalInputCost = inputItemsWithUnits.reduce((sum, item) => {
        const material = rawMaterials.find(rm => rm.id === item.commissary_item_id);
        return sum + item.quantity * (material?.unit_cost || 0);
      }, 0);

      // Add 5% repackaging overhead
      return totalInputCost * 1.05 / outputItem.quantity;
    })();
    const conversionRequest: ConversionRequest = {
      name: conversionName,
      description,
      input_items: inputItemsWithUnits,
      output_item: {
        ...outputItem,
        unit_cost: calculatedUnitCost
      }
    };
    console.log('Executing conversion:', conversionRequest);
    setConverting(true);
    const success = await executeConversion(conversionRequest);
    if (success) {
      onConversionComplete();
      resetForm();
      toast.success(`Successfully repackaged: ${outputItem.name}`);
    }
    setConverting(false);
  };
  return <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Repackage Bulk Items
        </CardTitle>
        
      </CardHeader>
      <CardContent className="space-y-6">
        <ConversionBasicInfo conversionName={conversionName} setConversionName={setConversionName} description={description} setDescription={setDescription} />

        <ConversionInputItems inputItems={inputItems} setInputItems={setInputItems} rawMaterials={rawMaterials} />

        <ConversionOutputItem outputItem={outputItem} setOutputItem={setOutputItem} />

        <Button onClick={handleConversion} disabled={converting} className="w-full">
          {converting ? <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Repackaging...
            </> : <>
              <ArrowRight className="h-4 w-4 mr-2" />
              Process Repackaging
            </>}
        </Button>
      </CardContent>
    </Card>;
}