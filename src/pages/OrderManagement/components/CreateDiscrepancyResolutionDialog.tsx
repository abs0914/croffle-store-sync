
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Package, DollarSign } from 'lucide-react';
import { GoodsReceivedNote } from '@/types/orderManagement';
import { createDiscrepancyResolution } from '@/services/orderManagement/discrepancyResolutionService';

interface CreateDiscrepancyResolutionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  grn: GoodsReceivedNote | null;
  onSuccess: () => void;
}

export function CreateDiscrepancyResolutionDialog({ 
  open, 
  onOpenChange, 
  grn, 
  onSuccess 
}: CreateDiscrepancyResolutionDialogProps) {
  const [resolutionType, setResolutionType] = useState<'replace' | 'refund'>('replace');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [financialAdjustment, setFinancialAdjustment] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!grn?.id || !grn.purchase_order?.id) {
      return;
    }

    setLoading(true);
    try {
      const success = await createDiscrepancyResolution(
        grn.id,
        grn.purchase_order.id,
        resolutionType,
        resolutionNotes,
        financialAdjustment
      );
      
      if (success) {
        onSuccess();
        onOpenChange(false);
        resetForm();
      }
    } catch (error) {
      console.error('Error creating discrepancy resolution:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setResolutionType('replace');
    setResolutionNotes('');
    setFinancialAdjustment(0);
  };

  if (!grn) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Process Discrepancy Resolution
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-4 w-4" />
              <span className="font-medium">GRN Details</span>
            </div>
            <p className="text-sm">GRN: {grn.grn_number}</p>
            <p className="text-sm">Order: {grn.purchase_order?.order_number}</p>
            <p className="text-sm">Store: {grn.purchase_order?.store?.name}</p>
            <p className="text-sm">Total: ₱{grn.purchase_order?.total_amount?.toLocaleString()}</p>
          </div>

          <div>
            <Label htmlFor="resolutionType">Resolution Type *</Label>
            <Select value={resolutionType} onValueChange={(value: 'replace' | 'refund') => setResolutionType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="replace">Replace Order</SelectItem>
                <SelectItem value="refund">Issue Refund</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="financialAdjustment">Financial Adjustment (₱)</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="financialAdjustment"
                type="number"
                placeholder="0.00"
                value={financialAdjustment}
                onChange={(e) => setFinancialAdjustment(parseFloat(e.target.value) || 0)}
                className="pl-10"
                step="0.01"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="resolutionNotes">Resolution Notes</Label>
            <Textarea
              id="resolutionNotes"
              placeholder="Describe the discrepancy and resolution details..."
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Creating...' : `Create ${resolutionType === 'replace' ? 'Replacement' : 'Refund'} Request`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
