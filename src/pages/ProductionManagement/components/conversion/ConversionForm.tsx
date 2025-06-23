
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

export function ConversionForm({ rawMaterials, onConversionComplete }: ConversionFormProps) {
  const [converting, setConverting] = useState(false);
  
  // Form state
  const [conversionName, setConversionName] = useState("");
  const [description, setDescription] = useState("");
  const [inputItems, setInputItems] = useState<{ commissary_item_id: string; quantity: number }[]>([
    { commissary_item_id: "", quantity: 1 }
  ]);
  const [outputItem, setOutputItem] = useState({
    name: "",
    category: "raw_materials" as const,
    uom: "",
    quantity: 1,
    unit_cost: 0,
    sku: "",
    storage_location: ""
  });

  const resetForm = () => {
    setConversionName("");
    setDescription("");
    setInputItems([{ commissary_item_id: "", quantity: 1 }]);
    setOutputItem({
      name: "",
      category: "raw_materials",
      uom: "",
      quantity: 1,
      unit_cost: 0,
      sku: "",
      storage_location: ""
    });
  };

  const handleConversion = async () => {
    if (!conversionName.trim()) {
      toast.error("Please enter a conversion name");
      return;
    }

    if (!outputItem.name.trim()) {
      toast.error("Please enter an output item name");
      return;
    }

    if (!outputItem.uom) {
      toast.error("Please select a unit of measure for the output item");
      return;
    }

    const validInputItems = inputItems.filter(item => 
      item.commissary_item_id && item.quantity > 0
    );

    if (validInputItems.length === 0) {
      toast.error("Please select at least one input item with valid quantity");
      return;
    }

    const conversionRequest: ConversionRequest = {
      name: conversionName,
      description,
      input_items: validInputItems,
      output_item: outputItem
    };

    setConverting(true);
    const success = await executeConversion(conversionRequest);
    
    if (success) {
      onConversionComplete();
      resetForm();
    }
    
    setConverting(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Create Conversion
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ConversionBasicInfo 
          conversionName={conversionName}
          setConversionName={setConversionName}
          description={description}
          setDescription={setDescription}
        />

        <ConversionInputItems 
          inputItems={inputItems}
          setInputItems={setInputItems}
          rawMaterials={rawMaterials}
        />

        <ConversionOutputItem 
          outputItem={outputItem}
          setOutputItem={setOutputItem}
        />

        <Button
          onClick={handleConversion}
          disabled={converting}
          className="w-full"
        >
          {converting ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Converting...
            </>
          ) : (
            <>
              <ArrowRight className="h-4 w-4 mr-2" />
              Execute Conversion
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
