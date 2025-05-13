
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { AlertCircle } from "lucide-react";
import { InventoryStock } from "@/types";

interface InventoryCountSectionProps {
  inventoryItems: InventoryStock[];
  inventoryCount: Record<string, number>;
  handleInventoryCountChange: (itemId: string, value: number) => void;
  isLoadingInventory: boolean;
  error?: any;
}

export default function InventoryCountSection({
  inventoryItems,
  inventoryCount,
  handleInventoryCountChange,
  isLoadingInventory,
  error
}: InventoryCountSectionProps) {
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
