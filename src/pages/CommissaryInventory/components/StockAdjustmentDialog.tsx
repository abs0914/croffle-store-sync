import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingUp, TrendingDown, RotateCcw } from "lucide-react";
import { CommissaryInventoryItem } from "@/types/inventoryManagement";
import { adjustCommissaryInventoryStock } from "@/services/inventoryManagement/commissaryInventoryService";
import { useAuth } from "@/contexts/auth";

interface StockAdjustmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: CommissaryInventoryItem | null;
  onSuccess: () => void;
}

type AdjustmentType = 'increase' | 'decrease' | 'set';

export function StockAdjustmentDialog({
  open,
  onOpenChange,
  item,
  onSuccess
}: StockAdjustmentDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [adjustmentType, setAdjustmentType] = useState<AdjustmentType>('increase');
  const [quantity, setQuantity] = useState(0);
  const [reason, setReason] = useState('');
  const [newStock, setNewStock] = useState(0);

  useEffect(() => {
    if (item && open) {
      setNewStock(item.current_stock);
      setQuantity(0);
      setReason('');
      setAdjustmentType('increase');
    }
  }, [item, open]);

  useEffect(() => {
    if (item) {
      switch (adjustmentType) {
        case 'increase':
          setNewStock(item.current_stock + quantity);
          break;
        case 'decrease':
          setNewStock(Math.max(0, item.current_stock - quantity));
          break;
        case 'set':
          setNewStock(quantity);
          break;
      }
    }
  }, [adjustmentType, quantity, item]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item || !user?.id) return;

    if (adjustmentType === 'decrease' && quantity > item.current_stock) {
      return; // This should be prevented by the UI
    }

    if (!reason.trim()) {
      return; // Reason is required
    }

    setLoading(true);

    const success = await adjustCommissaryInventoryStock(
      item.id,
      newStock,
      reason,
      user.id
    );

    setLoading(false);

    if (success) {
      onSuccess();
      onOpenChange(false);
      setQuantity(0);
      setReason('');
    }
  };

  const getAdjustmentIcon = (type: AdjustmentType) => {
    switch (type) {
      case 'increase': return <TrendingUp className="h-4 w-4" />;
      case 'decrease': return <TrendingDown className="h-4 w-4" />;
      case 'set': return <RotateCcw className="h-4 w-4" />;
    }
  };

  const getAdjustmentColor = (type: AdjustmentType) => {
    switch (type) {
      case 'increase': return 'text-green-600';
      case 'decrease': return 'text-red-600';
      case 'set': return 'text-blue-600';
    }
  };

  const isValidAdjustment = () => {
    if (adjustmentType === 'decrease' && quantity > (item?.current_stock || 0)) {
      return false;
    }
    if (quantity <= 0 && adjustmentType !== 'set') {
      return false;
    }
    if (adjustmentType === 'set' && quantity < 0) {
      return false;
    }
    return reason.trim().length > 0;
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust Stock - {item.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Stock Display */}
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-medium">Current Stock:</span>
              <Badge variant="outline" className="text-lg">
                {item.current_stock} {item.unit}
              </Badge>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Adjustment Type */}
            <div className="space-y-2">
              <Label>Adjustment Type</Label>
              <div className="grid grid-cols-3 gap-2">
                {(['increase', 'decrease', 'set'] as AdjustmentType[]).map((type) => (
                  <Button
                    key={type}
                    type="button"
                    variant={adjustmentType === type ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAdjustmentType(type)}
                    className={`flex items-center gap-2 ${getAdjustmentColor(type)}`}
                  >
                    {getAdjustmentIcon(type)}
                    {type === 'set' ? 'Set To' : type}
                  </Button>
                ))}
              </div>
            </div>

            {/* Quantity Input */}
            <div className="space-y-2">
              <Label htmlFor="quantity">
                {adjustmentType === 'set' ? 'New Stock Level' : 'Quantity'}
              </Label>
              <div className="flex gap-2">
                <Input
                  id="quantity"
                  type="number"
                  min="0"
                  step="0.01"
                  value={quantity}
                  onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                  placeholder={adjustmentType === 'set' ? 'Enter new stock level' : 'Enter quantity'}
                  required
                />
                <div className="flex items-center px-3 bg-muted rounded-md">
                  <span className="text-sm text-muted-foreground">{item.unit}</span>
                </div>
              </div>
              
              {adjustmentType === 'decrease' && quantity > item.current_stock && (
                <div className="flex items-center gap-2 text-red-600 text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  Cannot decrease by more than current stock
                </div>
              )}
            </div>

            {/* New Stock Preview */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-blue-800">New Stock Level:</span>
                <Badge 
                  variant="outline" 
                  className={`${newStock <= item.minimum_threshold ? 'border-red-500 text-red-700' : 'border-blue-500 text-blue-700'}`}
                >
                  {newStock} {item.unit}
                </Badge>
              </div>
              {newStock <= item.minimum_threshold && (
                <div className="flex items-center gap-2 text-red-600 text-xs mt-1">
                  <AlertTriangle className="h-3 w-3" />
                  Below minimum threshold ({item.minimum_threshold} {item.unit})
                </div>
              )}
            </div>

            {/* Reason */}
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Adjustment *</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Enter reason for stock adjustment..."
                rows={3}
                required
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={loading || !isValidAdjustment()}
                className={getAdjustmentColor(adjustmentType)}
              >
                {loading ? 'Adjusting...' : `${adjustmentType === 'set' ? 'Set' : adjustmentType} Stock`}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
