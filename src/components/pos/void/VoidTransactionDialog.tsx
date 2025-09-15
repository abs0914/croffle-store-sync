import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Receipt, User, Clock, DollarSign } from "lucide-react";
import { formatCurrency } from "@/utils/format";
import { format } from "date-fns";
import { VoidTransactionData, VoidRequestData, VoidReasonCategory } from "@/services/transactions/voidTransactionService";
import { useAuth } from "@/contexts/auth";
import { useStore } from "@/contexts/StoreContext";

interface VoidTransactionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: any | null;
  onConfirmVoid: (data: VoidRequestData) => Promise<void>;
  isVoiding: boolean;
}

const voidReasons = [
  { value: 'cashier_error' as VoidReasonCategory, label: 'Cashier Error' },
  { value: 'customer_request' as VoidReasonCategory, label: 'Customer Request' },
  { value: 'system_error' as VoidReasonCategory, label: 'System Error' },
  { value: 'management_decision' as VoidReasonCategory, label: 'Management Decision' },
  { value: 'refund' as VoidReasonCategory, label: 'Refund' },
  { value: 'exchange' as VoidReasonCategory, label: 'Exchange' },
  { value: 'price_correction' as VoidReasonCategory, label: 'Price Correction' },
  { value: 'item_unavailable' as VoidReasonCategory, label: 'Item Unavailable' },
  { value: 'other' as VoidReasonCategory, label: 'Other' }
];

export function VoidTransactionDialog({
  isOpen,
  onClose,
  transaction,
  onConfirmVoid,
  isVoiding
}: VoidTransactionDialogProps) {
  const { user } = useAuth();
  const { currentStore } = useStore();
  const [reason, setReason] = useState('');
  const [reasonCategory, setReasonCategory] = useState<VoidReasonCategory>('cashier_error');
  const [notes, setNotes] = useState('');

  const handleVoid = async () => {
    if (!transaction || !reason.trim() || !user?.id || !currentStore?.id) return;

    await onConfirmVoid({
      storeId: currentStore.id,
      transactionId: transaction.id,
      receiptNumber: transaction.receipt_number,
      reasonCategory,
      reason: reason.trim(),
      notes: notes.trim() || undefined,
      voidedBy: user.id,
      cashierName: user.name || 'Unknown Cashier',
      terminalId: 'TERMINAL-01' // Default terminal ID
    });

    // Reset form
    setReason('');
    setReasonCategory('cashier_error');
    setNotes('');
  };

  const handleClose = () => {
    setReason('');
    setReasonCategory('cashier_error');
    setNotes('');
    onClose();
  };

  if (!transaction) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Void Transaction
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Transaction Details */}
          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Receipt className="h-4 w-4" />
              <span className="font-medium">Receipt: {transaction.receipt_number}</span>
            </div>
            
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4" />
              <span>{format(new Date(transaction.created_at), 'MMM dd, yyyy h:mm a')}</span>
            </div>
            
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="h-4 w-4" />
              <span className="font-semibold">{formatCurrency(transaction.total)}</span>
            </div>

            {transaction.customers && (
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4" />
                <span>{transaction.customers.name}</span>
              </div>
            )}
          </div>

          {/* Void Reason Category */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Reason Category</label>
            <Select value={reasonCategory} onValueChange={(value: VoidReasonCategory) => setReasonCategory(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {voidReasons.map((reason) => (
                  <SelectItem key={reason.value} value={reason.value}>
                    {reason.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Detailed Reason */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Detailed Reason *</label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Please provide a detailed explanation for voiding this transaction..."
              className="min-h-[80px]"
            />
          </div>

          {/* Additional Notes */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Additional Notes</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional information (optional)..."
              className="min-h-[60px]"
            />
          </div>

          {/* Warning */}
          <div className="bg-destructive/10 border border-destructive/20 p-3 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-destructive">Warning:</p>
                <p className="text-muted-foreground">
                  This action cannot be undone. The transaction will be marked as voided 
                  and inventory will be restored.
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isVoiding}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleVoid}
            disabled={isVoiding || !reason.trim()}
          >
            {isVoiding ? 'Voiding...' : 'Void Transaction'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}