
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import ShiftCamera from "../camera/ShiftCamera";
import { Shift, InventoryStock } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { fetchInventoryStock } from "@/services/inventoryStock";
import { Spinner } from "@/components/ui/spinner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface EndShiftDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  currentShift: Shift | null;
  onEndShift: (endingCash: number, endInventoryCount: Record<string, number>, photo?: string) => Promise<void>;
}

export default function EndShiftDialog({
  isOpen,
  onOpenChange,
  currentShift,
  onEndShift
}: EndShiftDialogProps) {
  const [endingCash, setEndingCash] = useState<number>(0);
  const [photo, setPhoto] = useState<string | null>(null);
  const [inventoryCount, setInventoryCount] = useState<Record<string, number>>({});

  // Fetch inventory items for this store
  const { data: inventoryItems = [], isLoading: isLoadingInventory } = useQuery({
    queryKey: ["inventory-stock", currentShift?.storeId],
    queryFn: () => currentShift?.storeId ? fetchInventoryStock(currentShift.storeId) : Promise.resolve([]),
    enabled: isOpen && !!currentShift?.storeId,
  });

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setEndingCash(0);
      setPhoto(null);
      setInventoryCount({});
    } else if (isOpen && inventoryItems.length > 0) {
      // Initialize inventory count with current stock quantities
      const initialCount = inventoryItems.reduce((acc, item) => {
        acc[item.id] = item.stock_quantity || 0;
        return acc;
      }, {} as Record<string, number>);
      
      setInventoryCount(initialCount);
    }
  }, [isOpen, inventoryItems]);

  const handleInventoryCountChange = (itemId: string, value: number) => {
    setInventoryCount(prev => ({
      ...prev,
      [itemId]: value
    }));
  };

  const handleSubmit = async () => {
    if (!currentShift) return;
    await onEndShift(endingCash, inventoryCount, photo || undefined);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>End Current Shift</DialogTitle>
          <DialogDescription>
            Please count your cash drawer and inventory levels before ending your shift.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4 flex-1 overflow-hidden">
          <div className="space-y-2">
            <Label htmlFor="endingCash">Ending Cash Amount</Label>
            <Input
              id="endingCash"
              type="number"
              value={endingCash || ''}
              onChange={(e) => setEndingCash(Number(e.target.value))}
              placeholder="0.00"
            />
          </div>
          
          <ShiftCamera onCapture={setPhoto} />
          
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
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            End Shift
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
