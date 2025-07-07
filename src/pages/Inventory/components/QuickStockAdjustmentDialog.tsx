import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Product } from "@/types";
import { updateProduct } from "@/services/product/productUpdate";
import { toast } from "sonner";

interface QuickStockAdjustmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onStockUpdated?: () => void;
}

export const QuickStockAdjustmentDialog = ({
  isOpen,
  onClose,
  product,
  onStockUpdated
}: QuickStockAdjustmentDialogProps) => {
  const [adjustmentType, setAdjustmentType] = useState<"add" | "remove" | "set">("add");
  const [quantity, setQuantity] = useState<number>(0);
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentStock = product?.stock_quantity || product?.stockQuantity || 0;

  useEffect(() => {
    if (isOpen) {
      // Reset form when dialog opens
      setAdjustmentType("add");
      setQuantity(0);
      setNotes("");
    }
  }, [isOpen]);

  const calculateNewStock = (): number => {
    switch (adjustmentType) {
      case "add":
        return currentStock + quantity;
      case "remove":
        return Math.max(0, currentStock - quantity);
      case "set":
        return Math.max(0, quantity);
      default:
        return currentStock;
    }
  };

  const handleSave = async () => {
    if (!product?.id) {
      toast.error("Product ID is missing");
      return;
    }

    if (quantity < 0 || (adjustmentType === "set" && quantity < 0)) {
      toast.error("Quantity cannot be negative");
      return;
    }

    setIsSubmitting(true);
    
    try {
      const newStock = calculateNewStock();
      
      const updatedProduct = await updateProduct(product.id, {
        stock_quantity: newStock,
        stockQuantity: newStock, // For compatibility
      });

      if (updatedProduct) {
        toast.success(`Stock updated successfully. New quantity: ${newStock}`);
        onStockUpdated?.();
        onClose();
      }
    } catch (error) {
      console.error("Error updating stock:", error);
      toast.error("Failed to update stock");
    } finally {
      setIsSubmitting(false);
    }
  };

  const newStock = calculateNewStock();

  if (!product) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Quick Stock Adjustment</DialogTitle>
          <DialogDescription>
            Update stock quantity for <strong>{product.name}</strong>
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <Label className="text-muted-foreground">Current Stock</Label>
              <div className="font-medium">{currentStock}</div>
            </div>
            <div>
              <Label className="text-muted-foreground">New Stock</Label>
              <div className={`font-medium ${newStock <= 10 ? 'text-destructive' : newStock > currentStock ? 'text-green-600' : ''}`}>
                {newStock}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="adjustment-type">Adjustment Type</Label>
            <Select
              value={adjustmentType}
              onValueChange={(value: "add" | "remove" | "set") => setAdjustmentType(value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="add">Add Stock</SelectItem>
                <SelectItem value="remove">Remove Stock</SelectItem>
                <SelectItem value="set">Set Exact Amount</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">
              {adjustmentType === "set" ? "New Quantity" : "Quantity to " + (adjustmentType === "add" ? "Add" : "Remove")}
            </Label>
            <Input
              id="quantity"
              type="number"
              min="0"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(0, parseInt(e.target.value) || 0))}
              placeholder="Enter quantity"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes about this adjustment"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSubmitting || quantity === 0}
          >
            {isSubmitting ? "Updating..." : "Update Stock"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};