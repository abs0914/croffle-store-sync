
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
import { useQuery } from "@tanstack/react-query";
import { fetchInventoryStock } from "@/services/inventoryStock";
import { InventoryStock } from "@/types";
import { Spinner } from "@/components/ui/spinner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Camera } from "lucide-react";
import { getPreviousShiftEndingCash } from "@/contexts/shift/shiftUtils";
import { useAuth } from "@/contexts/AuthContext";

interface StartShiftDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onStartShift: (startingCash: number, startInventoryCount: Record<string, number>, photo?: string) => Promise<void>;
  storeId: string | null;
}

export default function StartShiftDialog({
  isOpen,
  onOpenChange,
  onStartShift,
  storeId
}: StartShiftDialogProps) {
  const { user } = useAuth();
  const [startingCash, setStartingCash] = useState<number>(0);
  const [previousEndingCash, setPreviousEndingCash] = useState<number | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [inventoryCount, setInventoryCount] = useState<Record<string, number>>({});
  const [showCameraView, setShowCameraView] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Fetch inventory items for this store
  const { data: inventoryItems = [], isLoading: isLoadingInventory } = useQuery({
    queryKey: ["inventory-stock", storeId],
    queryFn: () => storeId ? fetchInventoryStock(storeId) : Promise.resolve([]),
    enabled: isOpen && !!storeId,
  });

  // Fetch previous shift ending cash when dialog opens
  useEffect(() => {
    if (isOpen && storeId && user) {
      setIsLoading(true);
      getPreviousShiftEndingCash(user.id, storeId)
        .then(cash => {
          setPreviousEndingCash(cash);
          setStartingCash(cash); // Set starting cash to previous ending cash
        })
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, storeId, user]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setPhoto(null);
      setInventoryCount({});
      setShowCameraView(false);
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
    await onStartShift(startingCash, inventoryCount, photo || undefined);
    setShowCameraView(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
    setShowCameraView(false);
  };

  const toggleCameraView = () => {
    setShowCameraView(!showCameraView);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Start New Shift</DialogTitle>
          <DialogDescription>
            Please count your cash drawer and inventory levels before starting your shift.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4 flex-1 overflow-hidden">
          <div className="space-y-2">
            <Label htmlFor="startingCash">
              Starting Cash Amount 
              {previousEndingCash !== null && (
                <span className="text-sm text-muted-foreground ml-2">
                  (Previous ending cash: {previousEndingCash.toFixed(2)})
                </span>
              )}
            </Label>
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <Spinner className="h-4 w-4" />
                <span className="text-sm">Loading previous cash amount...</span>
              </div>
            ) : (
              <Input
                id="startingCash"
                type="number"
                value={startingCash || ''}
                onChange={(e) => setStartingCash(Number(e.target.value))}
                placeholder="0.00"
              />
            )}
          </div>
          
          {showCameraView ? (
            <ShiftCamera 
              onCapture={(capturedPhoto) => {
                setPhoto(capturedPhoto);
                setShowCameraView(false);
              }}
              onReset={() => setShowCameraView(false)}
            />
          ) : (
            <div className="space-y-2">
              <Label>Shift Photo</Label>
              <div className="flex items-center space-x-2">
                {photo ? (
                  <div className="relative">
                    <img src={photo} alt="Shift start" className="w-full h-48 object-cover rounded-md border" />
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="absolute top-2 right-2" 
                      onClick={() => setPhoto(null)}
                    >
                      Reset
                    </Button>
                  </div>
                ) : (
                  <Button 
                    variant="outline" 
                    onClick={toggleCameraView} 
                    className="w-full"
                  >
                    <Camera className="mr-2 h-4 w-4" />
                    Take Photo
                  </Button>
                )}
              </div>
            </div>
          )}
          
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
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!photo}
            className="flex items-center"
          >
            <Camera className="mr-2 h-4 w-4" />
            Start Shift with Photo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
