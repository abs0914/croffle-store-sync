
import { useState, useEffect } from "react";
import { InventoryStock, Store } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

interface StockTransferModalProps {
  stockItem: InventoryStock;
  onTransfer: (sourceId: string, targetStoreId: string, quantity: number, notes?: string) => void;
  onCancel: () => void;
  isLoading: boolean;
}

export const StockTransferModal = ({ 
  stockItem, 
  onTransfer, 
  onCancel,
  isLoading 
}: StockTransferModalProps) => {
  const [transferData, setTransferData] = useState({
    quantity: 1,
    targetStoreId: "",
    notes: ""
  });
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoadingStores, setIsLoadingStores] = useState(false);

  useEffect(() => {
    const fetchStores = async () => {
      setIsLoadingStores(true);
      try {
        const { data, error } = await supabase
          .from('stores')
          .select('*')
          .eq('is_active', true)
          .neq('id', stockItem.store_id);
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          setStores(data as Store[]);
          // Set the first store as default if available
          if (data.length > 0 && !transferData.targetStoreId) {
            setTransferData(prev => ({...prev, targetStoreId: data[0].id}));
          }
        }
      } catch (error) {
        console.error("Error fetching stores:", error);
      } finally {
        setIsLoadingStores(false);
      }
    };

    fetchStores();
  }, [stockItem.store_id]);

  const handleChange = (field: string, value: any) => {
    setTransferData({
      ...transferData,
      [field]: value
    });
  };

  const handleSubmit = () => {
    if (!transferData.targetStoreId) {
      return; // Don't submit if no target store is selected
    }
    
    onTransfer(
      stockItem.id, 
      transferData.targetStoreId,
      transferData.quantity,
      transferData.notes
    );
  };

  const isValidQuantity = 
    transferData.quantity > 0 && 
    transferData.quantity <= stockItem.stock_quantity;

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Transfer Stock - {stockItem.item}</DialogTitle>
        <DialogDescription>
          Transfer stock to another store.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="target-store" className="text-right">
            To Store
          </Label>
          <div className="col-span-3">
            {isLoadingStores ? (
              <div className="flex items-center justify-center h-10">
                <Spinner className="h-4 w-4" />
              </div>
            ) : stores.length === 0 ? (
              <p className="text-sm text-muted-foreground">No other active stores available</p>
            ) : (
              <Select 
                value={transferData.targetStoreId} 
                onValueChange={(value) => handleChange("targetStoreId", value)}
                disabled={stores.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a store" />
                </SelectTrigger>
                <SelectContent>
                  {stores.map((store) => (
                    <SelectItem key={store.id} value={store.id}>
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="transfer-quantity" className="text-right">
            Quantity
          </Label>
          <Input
            id="transfer-quantity"
            type="number"
            value={transferData.quantity}
            onChange={(e) => handleChange("quantity", Number(e.target.value))}
            className="col-span-3"
            min="1"
            max={stockItem.stock_quantity}
          />
        </div>

        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="transfer-notes" className="text-right">
            Notes
          </Label>
          <Textarea
            id="transfer-notes"
            value={transferData.notes}
            onChange={(e) => handleChange("notes", e.target.value)}
            className="col-span-3"
            placeholder="Optional notes about this transfer"
          />
        </div>

        <div className="col-span-4 text-center">
          <p>
            Available Stock: <strong>{stockItem.stock_quantity}</strong> {stockItem.unit}
          </p>
          {!isValidQuantity && transferData.quantity > stockItem.stock_quantity && (
            <p className="text-destructive text-sm mt-1">
              Transfer quantity exceeds available stock
            </p>
          )}
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit}
          disabled={isLoading || !transferData.targetStoreId || !isValidQuantity}
          className="bg-croffle-accent hover:bg-croffle-accent/90"
        >
          {isLoading ? <Spinner className="mr-2" /> : null}
          Transfer Stock
        </Button>
      </DialogFooter>
    </DialogContent>
  );
};
