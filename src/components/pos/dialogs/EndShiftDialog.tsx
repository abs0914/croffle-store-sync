
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Camera } from "lucide-react";

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
  const [showCameraView, setShowCameraView] = useState<boolean>(false);
  const [cashError, setCashError] = useState<string | null>(null);

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
      setShowCameraView(false);
      setCashError(null);
    } else if (isOpen && inventoryItems.length > 0) {
      // Initialize inventory count with current stock quantities
      const initialCount = inventoryItems.reduce((acc, item) => {
        acc[item.id] = item.stock_quantity || 0;
        return acc;
      }, {} as Record<string, number>);
      
      setInventoryCount(initialCount);
      
      // Set ending cash to at least the starting cash amount
      if (currentShift?.startingCash) {
        setEndingCash(currentShift.startingCash);
      }
    }
  }, [isOpen, inventoryItems, currentShift]);

  // Validate ending cash amount whenever it changes
  useEffect(() => {
    if (currentShift && endingCash < currentShift.startingCash) {
      setCashError(`Ending cash must be at least ${currentShift.startingCash.toFixed(2)} (starting cash amount)`);
    } else {
      setCashError(null);
    }
  }, [endingCash, currentShift]);

  const handleInventoryCountChange = (itemId: string, value: number) => {
    setInventoryCount(prev => ({
      ...prev,
      [itemId]: value
    }));
  };

  const handleSubmit = async () => {
    if (!currentShift) return;
    
    // Double check cash validation
    if (endingCash < currentShift.startingCash) {
      setCashError(`Ending cash must be at least ${currentShift.startingCash.toFixed(2)} (starting cash amount)`);
      return;
    }
    
    await onEndShift(endingCash, inventoryCount, photo || undefined);
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
          <DialogTitle>End Current Shift</DialogTitle>
          <DialogDescription>
            Please count your cash drawer and inventory levels before ending your shift.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4 flex-1 overflow-hidden">
          <div className="space-y-2">
            <Label htmlFor="endingCash">
              Ending Cash Amount
              {currentShift && (
                <span className="text-sm text-muted-foreground ml-2">
                  (Starting cash: {currentShift.startingCash.toFixed(2)})
                </span>
              )}
            </Label>
            <Input
              id="endingCash"
              type="number"
              value={endingCash || ''}
              onChange={(e) => setEndingCash(Number(e.target.value))}
              placeholder="0.00"
              className={cashError ? "border-red-500" : ""}
            />
            
            {cashError && (
              <Alert variant="destructive" className="py-2 mt-1">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{cashError}</AlertDescription>
              </Alert>
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
                    <img src={photo} alt="Shift end" className="w-full h-48 object-cover rounded-md border" />
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
          <Button 
            onClick={handleSubmit} 
            disabled={!!cashError || !photo}
            className="flex items-center"
          >
            <Camera className="mr-2 h-4 w-4" />
            End Shift with Photo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
