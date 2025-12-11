import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, Search, Package, RotateCcw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { RefundData, RefundedItem, REFUND_REASON_CATEGORIES } from '@/types/refund';
import {
  checkRefundEligibility,
  findTransactionByReceiptNumber,
  processRefund,
} from '@/services/transactions/refundService';
import { useShift } from '@/contexts/shift';

interface RefundDialogProps {
  isOpen: boolean;
  onClose: () => void;
  storeId: string;
  userId: string;
  userName: string;
  preloadedTransaction?: any;
  onRefundComplete?: (refundReceiptNumber: string) => void;
}

export const RefundDialog: React.FC<RefundDialogProps> = ({
  isOpen,
  onClose,
  storeId,
  userId,
  userName,
  preloadedTransaction,
  onRefundComplete,
}) => {
  const { currentShift } = useShift();
  const [searchReceiptNumber, setSearchReceiptNumber] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [transaction, setTransaction] = useState<any>(null);
  const [eligibility, setEligibility] = useState<any>(null);
  const [selectedItems, setSelectedItems] = useState<Map<string, RefundedItem>>(new Map());
  const [refundReasonCategory, setRefundReasonCategory] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [refundNotes, setRefundNotes] = useState('');
  const [refundMethod, setRefundMethod] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Load preloaded transaction if provided
  useEffect(() => {
    if (preloadedTransaction && isOpen) {
      setTransaction(preloadedTransaction);
      checkEligibility(preloadedTransaction.id);
    }
  }, [preloadedTransaction, isOpen]);

  const checkEligibility = async (transactionId: string) => {
    const result = await checkRefundEligibility(transactionId, storeId);
    setEligibility(result);
  };

  const handleSearch = async () => {
    if (!searchReceiptNumber.trim()) {
      toast.error('Please enter a receipt number');
      return;
    }

    setIsSearching(true);
    try {
      const found = await findTransactionByReceiptNumber(searchReceiptNumber.trim(), storeId);
      if (found) {
        setTransaction(found);
        await checkEligibility(found.id);
      } else {
        toast.error('Transaction not found');
        setTransaction(null);
        setEligibility(null);
      }
    } finally {
      setIsSearching(false);
    }
  };

  const toggleItemSelection = (item: any, index: number) => {
    const key = `${item.productId || item.product_id}-${index}`;
    const newSelected = new Map(selectedItems);

    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.set(key, {
        productId: item.productId || item.product_id,
        productName: item.name || item.product_name,
        quantity: item.quantity,
        originalQuantity: item.quantity,
        unitPrice: item.price || item.unit_price,
        totalRefund: (item.price || item.unit_price) * item.quantity,
        returnToStock: true,
        isDamaged: false,
      });
    }

    setSelectedItems(newSelected);
  };

  const updateItemQuantity = (key: string, quantity: number) => {
    const item = selectedItems.get(key);
    if (!item) return;

    const clampedQty = Math.min(Math.max(1, quantity), item.originalQuantity);
    const newSelected = new Map(selectedItems);
    newSelected.set(key, {
      ...item,
      quantity: clampedQty,
      totalRefund: item.unitPrice * clampedQty,
    });
    setSelectedItems(newSelected);
  };

  const updateItemReturnStatus = (key: string, returnToStock: boolean, isDamaged: boolean) => {
    const item = selectedItems.get(key);
    if (!item) return;

    const newSelected = new Map(selectedItems);
    newSelected.set(key, {
      ...item,
      returnToStock,
      isDamaged,
    });
    setSelectedItems(newSelected);
  };

  const selectAllItems = () => {
    if (!transaction?.items) return;

    const items = typeof transaction.items === 'string' 
      ? JSON.parse(transaction.items) 
      : transaction.items;

    const newSelected = new Map<string, RefundedItem>();
    items.forEach((item: any, index: number) => {
      const key = `${item.productId || item.product_id}-${index}`;
      newSelected.set(key, {
        productId: item.productId || item.product_id,
        productName: item.name || item.product_name,
        quantity: item.quantity,
        originalQuantity: item.quantity,
        unitPrice: item.price || item.unit_price,
        totalRefund: (item.price || item.unit_price) * item.quantity,
        returnToStock: true,
        isDamaged: false,
      });
    });
    setSelectedItems(newSelected);
  };

  const calculateTotalRefund = () => {
    let total = 0;
    selectedItems.forEach((item) => {
      total += item.totalRefund;
    });
    return total;
  };

  const handleProcessRefund = async () => {
    if (!transaction || selectedItems.size === 0) {
      toast.error('Please select items to refund');
      return;
    }

    if (!refundReasonCategory) {
      toast.error('Please select a refund reason category');
      return;
    }

    if (!refundReason.trim()) {
      toast.error('Please provide a refund reason');
      return;
    }

    if (!refundMethod) {
      toast.error('Please select a refund method');
      return;
    }

    setIsProcessing(true);

    try {
      const refundData: RefundData = {
        storeId,
        originalTransactionId: transaction.id,
        originalReceiptNumber: transaction.receipt_number,
        refundType: selectedItems.size === (transaction.items?.length || 0) ? 'full' : 'partial',
        refundReasonCategory,
        refundReason,
        refundNotes,
        refundedItems: Array.from(selectedItems.values()),
        originalTransactionTotal: Number(transaction.total),
        refundAmount: calculateTotalRefund(),
        refundMethod,
        processedByUserId: userId,
        processedByName: userName,
        shiftId: currentShift?.id,
      };

      const result = await processRefund(refundData);

      if (result.success) {
        toast.success(`Refund processed successfully: ${result.receiptNumber}`);
        onRefundComplete?.(result.receiptNumber || '');
        handleClose();
      } else {
        toast.error(result.error || 'Failed to process refund');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setSearchReceiptNumber('');
    setTransaction(null);
    setEligibility(null);
    setSelectedItems(new Map());
    setRefundReasonCategory('');
    setRefundReason('');
    setRefundNotes('');
    setRefundMethod('');
    onClose();
  };

  const transactionItems = transaction?.items
    ? typeof transaction.items === 'string'
      ? JSON.parse(transaction.items)
      : transaction.items
    : [];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            Process Refund
          </DialogTitle>
          <DialogDescription>
            Search for a transaction and select items to refund
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Transaction Search */}
          {!preloadedTransaction && (
            <div className="flex gap-2">
              <Input
                placeholder="Enter receipt number (e.g., 20251211-1234-123456)"
                value={searchReceiptNumber}
                onChange={(e) => setSearchReceiptNumber(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button onClick={handleSearch} disabled={isSearching}>
                <Search className="h-4 w-4 mr-1" />
                Search
              </Button>
            </div>
          )}

          {/* Transaction Details */}
          {transaction && (
            <>
              <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Receipt #:</span>
                  <span className="font-medium">{transaction.receipt_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Date:</span>
                  <span>{new Date(transaction.created_at).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total:</span>
                  <span className="font-bold">₱{Number(transaction.total).toFixed(2)}</span>
                </div>
                {eligibility?.totalRefundedAmount > 0 && (
                  <div className="flex justify-between text-orange-600">
                    <span className="text-sm">Previously Refunded:</span>
                    <span>₱{eligibility.totalRefundedAmount.toFixed(2)}</span>
                  </div>
                )}
              </div>

              {/* Eligibility Warning */}
              {!eligibility?.eligible && (
                <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-lg flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-destructive">Cannot Process Refund</p>
                    <p className="text-sm text-muted-foreground">{eligibility?.reason}</p>
                  </div>
                </div>
              )}

              {/* Item Selection */}
              {eligibility?.eligible && (
                <>
                  <Separator />
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <Label className="text-base">Select Items to Refund</Label>
                      <Button variant="outline" size="sm" onClick={selectAllItems}>
                        Select All
                      </Button>
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {transactionItems.map((item: any, index: number) => {
                        const key = `${item.productId || item.product_id}-${index}`;
                        const isSelected = selectedItems.has(key);
                        const selectedItem = selectedItems.get(key);

                        return (
                          <div
                            key={key}
                            className={`p-3 border rounded-lg ${
                              isSelected ? 'border-primary bg-primary/5' : 'border-border'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => toggleItemSelection(item, index)}
                                />
                                <div>
                                  <p className="font-medium">{item.name || item.product_name}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {item.quantity} × ₱{(item.price || item.unit_price).toFixed(2)}
                                  </p>
                                </div>
                              </div>
                              <span className="font-medium">
                                ₱{((item.price || item.unit_price) * item.quantity).toFixed(2)}
                              </span>
                            </div>

                            {/* Quantity and Return Status for selected items */}
                            {isSelected && selectedItem && (
                              <div className="mt-3 pt-3 border-t space-y-2">
                                <div className="flex items-center gap-4">
                                  <Label className="text-sm w-20">Qty:</Label>
                                  <Input
                                    type="number"
                                    min={1}
                                    max={selectedItem.originalQuantity}
                                    value={selectedItem.quantity}
                                    onChange={(e) =>
                                      updateItemQuantity(key, parseInt(e.target.value) || 1)
                                    }
                                    className="w-20"
                                  />
                                  <span className="text-sm text-muted-foreground">
                                    of {selectedItem.originalQuantity}
                                  </span>
                                </div>
                                <div className="flex gap-4">
                                  <div className="flex items-center gap-2">
                                    <Checkbox
                                      id={`return-${key}`}
                                      checked={selectedItem.returnToStock}
                                      onCheckedChange={(checked) =>
                                        updateItemReturnStatus(key, !!checked, selectedItem.isDamaged)
                                      }
                                    />
                                    <Label htmlFor={`return-${key}`} className="text-sm flex items-center gap-1">
                                      <Package className="h-3 w-3" />
                                      Return to Stock
                                    </Label>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Checkbox
                                      id={`damaged-${key}`}
                                      checked={selectedItem.isDamaged}
                                      onCheckedChange={(checked) =>
                                        updateItemReturnStatus(key, selectedItem.returnToStock, !!checked)
                                      }
                                    />
                                    <Label htmlFor={`damaged-${key}`} className="text-sm flex items-center gap-1">
                                      <Trash2 className="h-3 w-3" />
                                      Mark as Damaged
                                    </Label>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <Separator />

                  {/* Refund Reason */}
                  <div className="space-y-3">
                    <div>
                      <Label>Reason Category *</Label>
                      <Select value={refundReasonCategory} onValueChange={setRefundReasonCategory}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select reason category" />
                        </SelectTrigger>
                        <SelectContent>
                          {REFUND_REASON_CATEGORIES.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>
                              {cat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Detailed Reason *</Label>
                      <Textarea
                        placeholder="Describe the reason for this refund..."
                        value={refundReason}
                        onChange={(e) => setRefundReason(e.target.value)}
                        rows={2}
                      />
                    </div>

                    <div>
                      <Label>Additional Notes</Label>
                      <Textarea
                        placeholder="Any additional notes (optional)"
                        value={refundNotes}
                        onChange={(e) => setRefundNotes(e.target.value)}
                        rows={2}
                      />
                    </div>
                  </div>

                  {/* Refund Method */}
                  <div>
                    <Label>Refund Method *</Label>
                    <Select value={refundMethod} onValueChange={setRefundMethod}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select refund method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="card">Card (Original)</SelectItem>
                        <SelectItem value="e-wallet">E-Wallet (Original)</SelectItem>
                        <SelectItem value="store-credit">Store Credit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Refund Total */}
                  <div className="bg-primary/10 p-4 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Refund Amount:</span>
                      <span className="text-2xl font-bold text-primary">
                        ₱{calculateTotalRefund().toFixed(2)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedItems.size} item(s) selected
                    </p>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          {eligibility?.eligible && (
            <Button
              onClick={handleProcessRefund}
              disabled={isProcessing || selectedItems.size === 0}
            >
              {isProcessing ? 'Processing...' : 'Process Refund'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
