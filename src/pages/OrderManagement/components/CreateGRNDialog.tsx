
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Package2 } from 'lucide-react';
import { PurchaseOrder } from '@/types/orderManagement';
import { createGRN, updateGRN } from '@/services/orderManagement/grnService';
import { useAuth } from '@/contexts/auth';
import { toast } from 'sonner';

interface CreateGRNDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableOrders: PurchaseOrder[];
  onSuccess: () => void;
}

export function CreateGRNDialog({ open, onOpenChange, availableOrders, onSuccess }: CreateGRNDialogProps) {
  const { user } = useAuth();
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [qualityCheckPassed, setQualityCheckPassed] = useState(true);
  const [hasDiscrepancies, setHasDiscrepancies] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [digitalSignature, setDigitalSignature] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!selectedOrderId || !user?.id) {
      toast.error('Please select a purchase order');
      return;
    }

    setLoading(true);
    try {
      const grn = await createGRN(selectedOrderId, user.id);
      
      if (grn) {
        // Update the GRN with additional details if provided
        const updates: any = {};
        if (remarks) updates.remarks = remarks;
        if (digitalSignature) updates.digital_signature = digitalSignature;
        if (qualityCheckPassed !== null) updates.quality_check_passed = qualityCheckPassed;
        
        if (Object.keys(updates).length > 0) {
          await updateGRN(grn.id, updates);
        }
        
        onSuccess();
        resetForm();
      }
    } catch (error) {
      console.error('Error creating GRN:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedOrderId('');
    setQualityCheckPassed(true);
    setHasDiscrepancies(false);
    setRemarks('');
    setDigitalSignature('');
  };

  const selectedOrder = availableOrders.find(order => order.id === selectedOrderId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package2 className="h-5 w-5" />
            Create Goods Received Note
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="purchaseOrder">Purchase Order *</Label>
            <Select value={selectedOrderId} onValueChange={setSelectedOrderId}>
              <SelectTrigger>
                <SelectValue placeholder="Select purchase order" />
              </SelectTrigger>
              <SelectContent>
                {availableOrders.map((order) => (
                  <SelectItem key={order.id} value={order.id}>
                    {order.order_number} - ₱{order.total_amount} ({order.items?.length || 0} items)
                  </SelectItem>
                ))}
                {availableOrders.length === 0 && (
                  <SelectItem value="none" disabled>
                    No delivered orders available for GRN
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {selectedOrder && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium">Order Details:</p>
              <p className="text-sm">Order: {selectedOrder.order_number}</p>
              <p className="text-sm">Total: ₱{selectedOrder.total_amount}</p>
              <p className="text-sm">Items: {selectedOrder.items?.length || 0}</p>
              <p className="text-sm">Store: {selectedOrder.store?.name || 'N/A'}</p>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Checkbox 
              id="qualityCheck" 
              checked={qualityCheckPassed}
              onCheckedChange={(checked) => setQualityCheckPassed(checked as boolean)}
            />
            <Label htmlFor="qualityCheck">Quality check passed</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox 
              id="hasDiscrepancies" 
              checked={hasDiscrepancies}
              onCheckedChange={(checked) => setHasDiscrepancies(checked as boolean)}
            />
            <Label htmlFor="hasDiscrepancies">Report discrepancies (missing/damaged items)</Label>
          </div>

          {hasDiscrepancies && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Discrepancies will be recorded and can be managed through the damaged goods system.
              </AlertDescription>
            </Alert>
          )}

          <div>
            <Label htmlFor="remarks">Remarks & Notes</Label>
            <Textarea
              id="remarks"
              placeholder="Any discrepancies, notes, or observations..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="signature">Digital Signature</Label>
            <Input
              id="signature"
              placeholder="Enter your name or signature"
              value={digitalSignature}
              onChange={(e) => setDigitalSignature(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !selectedOrderId}>
            {loading ? 'Creating...' : 'Create GRN'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
