
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { InventoryStock } from "@/types";

interface InventoryCountSectionProps {
  inventoryItems: InventoryStock[];
  inventoryCount: Record<string, number>;
  handleInventoryCountChange: (itemId: string, value: number) => void;
  isLoadingInventory: boolean;
}

export default function InventoryCountSection({
  inventoryItems,
  inventoryCount,
  handleInventoryCountChange,
  isLoadingInventory
}: InventoryCountSectionProps) {
  if (isLoadingInventory) {
    return (
      <div className="space-y-2">
        <Label>Starting Inventory Count</Label>
        <div className="flex items-center space-x-2">
          <Spinner className="h-4 w-4" />
          <span className="text-sm">Loading inventory items...</span>
        </div>
      </div>
    );
  }

  if (inventoryItems.length === 0) {
    return (
      <div className="space-y-2">
        <Label>Starting Inventory Count</Label>
        <div className="text-sm text-amber-600 bg-amber-50 p-2 rounded border">
          No inventory items found for this store.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label>Starting Inventory Count ({inventoryItems.length} items)</Label>
      <ScrollArea className="h-48 border rounded-md p-2">
        <div className="space-y-2">
          {inventoryItems.map((item) => (
            <div key={item.id} className="flex items-center justify-between space-x-2 p-2 border rounded">
              <div className="flex-1">
                <p className="text-sm font-medium">{item.item}</p>
                <p className="text-xs text-muted-foreground">
                  Current stock: {item.stock_quantity} {item.unit}
                </p>
              </div>
              <div className="w-20">
                <Input
                  type="number"
                  value={inventoryCount[item.id] || 0}
                  onChange={(e) => handleInventoryCountChange(item.id, Number(e.target.value))}
                  className="text-sm"
                  min="0"
                />
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
