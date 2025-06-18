
import { useState, useEffect } from "react";
import { InventoryStock } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface StockTransferModalProps {
  stockItem: InventoryStock;
  onTransfer: (fromStoreId: string, toStoreId: string, inventoryItemId: string, quantity: number, notes?: string) => void;
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
    toStoreId: "",
    quantity: 1,
    notes: ""
  });

  // Fetch available stores for transfer (excluding current store)
  const { data: stores = [] } = useQuery({
    queryKey: ['stores-for-transfer', stockItem.store_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stores')
        .select('id, name')
        .neq('id', stockItem.store_id)
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data || [];
    }
  });

  const handleChange = (field: string, value: any) => {
    setTransferData({
      ...transferData,
      [field]: value
    });
  };

  const handleSubmit = () => {
    if (!transferData.toStoreId) return;
    
    onTransfer(
      stockItem.store_id,
      transferData.toStoreId,
      stockItem.id,
      transferData.quantity,
      transferData.notes
    );
  };

  const isValidTransfer = transferData.toStoreId && 
                         transferData.quantity > 0 && 
                         transferData.quantity <= stockItem.stock_quantity;

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Transfer Stock - {stockItem.item}</DialogTitle>
        <DialogDescription>
          Transfer inventory from this store to another store. This will reduce stock here and increase stock at the destination.
        </DialogDescription>
      </DialogHeader>
      
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="current-stock" className="text-right">
            Current Stock
          </Label>
          <div className="col-span-3 text-sm text-muted-foreground">
            {stockItem.stock_quantity} {stockItem.unit}
          </div>
        </div>

        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="destination-store" className="text-right">
            Destination Store
          </Label>
          <Select 
            value={transferData.toStoreId} 
            onValueChange={(value) => handleChange("toStoreId", value)}
          >
            <SelectTrigger className="col-span-3">
              <SelectValue placeholder="Select destination store" />
            </SelectTrigger>
            <SelectContent>
              {stores.map((store) => (
                <SelectItem key={store.id} value={store.id}>
                  {store.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
            placeholder="Optional transfer notes"
          />
        </div>

        {transferData.quantity > stockItem.stock_quantity && (
          <div className="col-span-4 text-sm text-destructive">
            Transfer quantity cannot exceed current stock ({stockItem.stock_quantity} {stockItem.unit})
          </div>
        )}
      </div>
      
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit}
          disabled={isLoading || !isValidTransfer}
          className="bg-croffle-accent hover:bg-croffle-accent/90"
        >
          {isLoading ? <Spinner className="mr-2" /> : null}
          Transfer Stock
        </Button>
      </DialogFooter>
    </DialogContent>
  );
};
