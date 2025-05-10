
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
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
  return (
    <div className="space-y-2">
      <Label>Current Inventory Levels</Label>
      {isLoadingInventory ? (
        <div className="flex items-center justify-center p-4">
          <Spinner className="h-8 w-8 text-croffle-accent" />
          <span className="ml-2">Loading inventory items...</span>
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
                <TableHead className="w-[150px] text-right">Current Count</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inventoryItems.map((item: InventoryStock) => (
                <TableRow key={item.id}>
                  <TableCell>{item.item}</TableCell>
                  <TableCell>{item.unit}</TableCell>
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
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      )}
    </div>
  );
}
