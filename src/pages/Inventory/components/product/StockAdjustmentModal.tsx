
import React, { useState } from 'react';
import { Product } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface StockAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onAdjust: (productId: string, adjustment: number, reason: string) => Promise<void>;
}

export function StockAdjustmentModal({ isOpen, onClose, product, onAdjust }: StockAdjustmentModalProps) {
  const [adjustment, setAdjustment] = useState(0);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!product) return;
    
    if (adjustment === 0) {
      toast.error('Please enter an adjustment amount');
      return;
    }

    if (!reason.trim()) {
      toast.error('Please provide a reason for the adjustment');
      return;
    }

    try {
      setIsSubmitting(true);
      await onAdjust(product.id, adjustment, reason);
      setAdjustment(0);
      setReason('');
      onClose();
    } catch (error) {
      console.error('Error adjusting stock:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const newStock = product ? product.stock_quantity + adjustment : 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust Stock - {product?.name}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Current Stock</Label>
              <Input 
                value={product?.stock_quantity || 0} 
                disabled 
                className="bg-muted"
              />
            </div>
            <div>
              <Label>New Stock</Label>
              <Input 
                value={newStock} 
                disabled 
                className="bg-muted"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="adjustment">Adjustment Amount</Label>
            <Input
              id="adjustment"
              type="number"
              value={adjustment}
              onChange={(e) => setAdjustment(Number(e.target.value))}
              placeholder="Enter positive or negative number"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Use positive numbers to increase stock, negative to decrease
            </p>
          </div>
          
          <div>
            <Label htmlFor="reason">Reason for Adjustment</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter reason for stock adjustment..."
              required
            />
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Adjusting...' : 'Adjust Stock'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
