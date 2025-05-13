
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { AlertCircle } from "lucide-react";
import { InventoryStock } from "@/types";

interface EndShiftInventorySectionProps {
  inventoryItems: InventoryStock[];
  inventoryCount: Record<string, number>;
  handleInventoryCountChange: (itemId: string, value: number) => void;
  isLoadingInventory: boolean;
  currentShift: any;
  error?: any;
}

export default function EndShiftInventorySection({
  inventoryItems,
  inventoryCount,
  handleInventoryCountChange,
  isLoadingInventory,
  currentShift,
  error
}: EndShiftInventorySectionProps) {
  return (
    <div className="space-y-2">
      <Label>Current Inventory Levels</Label>
      {isLoadingInventory ? (
        <div className="flex items-center justify-center p-4">
          <Spinner className="h-8 w-8 text-croffle-accent" />
          <span className="ml-2">Loading inventory items...</span>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center p-4 text-red-500 border border-red-200 rounded-md bg-red-50">
          <AlertCircle className="h-5 w-5 mr-2" />
          <span>Unable to load inventory items. Please try again.</span>
        </div>
      ) : inventoryItems.length === 0 ? (
        <p className="text-sm text-muted-foreground">No inventory items found.</p>
      ) : (
        <ScrollArea className="h-[300px] border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Start Count</TableHead>
                <TableHead className="w-[150px] text-right">End Count</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inventoryItems.map((item: InventoryStock) => {
                // Get starting inventory count from shift data if available
                const startCount = currentShift?.startInventoryCount?.[item.id] || 0;
                
                return (
                  <TableRow key={item.id}>
                    <TableCell>{item.item}</TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell>{startCount}</TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        min="0"
                        value={inventoryCount[item.id] || 0}
                        onChange={(e) => handleInventoryCountChange(item.id, Number(e.target.value))}
                        className="w-24 ml-auto"
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ScrollArea>
      )}
    </div>
  );
}
