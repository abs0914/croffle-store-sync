
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Package2, CheckCircle, XCircle } from 'lucide-react';
import { PurchaseOrder } from '@/types/orderManagement';
import { createGRNWithItems } from '@/services/orderManagement/grnService';
import { useAuth } from '@/contexts/auth';
import { toast } from 'sonner';

interface EnhancedCreateGRNDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableOrders: PurchaseOrder[];
  onSuccess: () => void;
}

interface GRNItemData {
  purchase_order_item_id: string;
  item_name: string;
  ordered_quantity: number;
  received_quantity: number;
  quality_status: 'good' | 'damaged' | 'missing' | 'partial';
  item_remarks: string;
}

export function EnhancedCreateGRNDialog({ 
  open, 
  onOpenChange, 
  availableOrders, 
  onSuccess 
}: EnhancedCreateGRNDialogProps) {
  const { user } = useAuth();
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [grnItems, setGrnItems] = useState<GRNItemData[]>([]);
  const [overallRemarks, setOverallRemarks] = useState('');
  const [digitalSignature, setDigitalSignature] = useState('');
  const [loading, setLoading] = useState(false);

  const selectedOrder = availableOrders.find(order => order.id === selectedOrderId);

  const handleOrderSelection = (orderId: string) => {
    setSelectedOrderId(orderId);
    const order = availableOrders.find(o => o.id === orderId);
    
    if (order?.items) {
      const items: GRNItemData[] = order.items.map(item => ({
        purchase_order_item_id: item.id,
        item_name: item.inventory_stock?.item || 'Unknown Item',
        ordered_quantity: item.quantity,
        received_quantity: item.quantity, // Default to ordered quantity
        quality_status: 'good',
        item_remarks: ''
      }));
      setGrnItems(items);
    }
  };

  const updateGRNItem = (index: number, field: keyof GRNItemData, value: any) => {
    const updated = [...grnItems];
    updated[index] = { ...updated[index], [field]: value };
    setGrnItems(updated);
  };

  const getQualityStatusIcon = (status: string) => {
    switch (status) {
      case 'good':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'damaged':
      case 'partial':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'missing':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getQualityStatusColor = (status: string) => {
    switch (status) {
      case 'good':
        return 'text-green-600';
      case 'damaged':
      case 'partial':
        return 'text-yellow-600';
      case 'missing':
        return 'text-red-600';
      default:
        return '';
    }
  };

  const hasDiscrepancies = grnItems.some(item => 
    item.quality_status !== 'good' || item.received_quantity !== item.ordered_quantity
  );

  const goodItemsCount = grnItems.filter(item => item.quality_status === 'good').length;
  const totalItems = grnItems.length;

  const handleSubmit = async () => {
    if (!selectedOrderId || !user?.id) {
      toast.error('Please select a purchase order');
      return;
    }

    if (grnItems.length === 0) {
      toast.error('No items to process');
      return;
    }

    setLoading(true);
    try {
      const result = await createGRNWithItems(
        selectedOrderId,
        user.id,
        grnItems.map(item => ({
          purchase_order_item_id: item.purchase_order_item_id,
          received_quantity: item.received_quantity,
          quality_status: item.quality_status,
          item_remarks: item.item_remarks || undefined
        })),
        overallRemarks || undefined,
        digitalSignature || undefined
      );

      if (result) {
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
    setGrnItems([]);
    setOverallRemarks('');
    setDigitalSignature('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package2 className="h-5 w-5" />
            Create Enhanced Goods Received Note
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="purchaseOrder">Purchase Order *</Label>
            <Select value={selectedOrderId} onValueChange={handleOrderSelection}>
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

          {grnItems.length > 0 && (
            <>
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Item-Level Inspection</h3>
                <div className="flex gap-4 text-sm">
                  <span className="text-green-600">Good: {goodItemsCount}</span>
                  <span className="text-gray-600">Total: {totalItems}</span>
                  {hasDiscrepancies && (
                    <Badge variant="destructive">Discrepancies Found</Badge>
                  )}
                </div>
              </div>

              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Ordered</TableHead>
                      <TableHead>Received</TableHead>
                      <TableHead>Quality Status</TableHead>
                      <TableHead>Remarks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {grnItems.map((item, index) => (
                      <TableRow key={item.purchase_order_item_id}>
                        <TableCell className="font-medium">
                          {item.item_name}
                        </TableCell>
                        <TableCell>{item.ordered_quantity}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.received_quantity}
                            onChange={(e) => updateGRNItem(index, 'received_quantity', Number(e.target.value))}
                            className="w-20"
                            min="0"
                            max={item.ordered_quantity}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Select
                              value={item.quality_status}
                              onValueChange={(value) => updateGRNItem(index, 'quality_status', value)}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="good">Good</SelectItem>
                                <SelectItem value="damaged">Damaged</SelectItem>
                                <SelectItem value="missing">Missing</SelectItem>
                                <SelectItem value="partial">Partial</SelectItem>
                              </SelectContent>
                            </Select>
                            {getQualityStatusIcon(item.quality_status)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            placeholder="Item-specific remarks..."
                            value={item.item_remarks}
                            onChange={(e) => updateGRNItem(index, 'item_remarks', e.target.value)}
                            className="w-48"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}

          {hasDiscrepancies && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Discrepancies detected. Automatic resolution requests will be created for items with issues.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="overallRemarks">Overall Remarks & Notes</Label>
              <Textarea
                id="overallRemarks"
                placeholder="General observations, delivery conditions, etc..."
                value={overallRemarks}
                onChange={(e) => setOverallRemarks(e.target.value)}
                rows={3}
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !selectedOrderId}>
            {loading ? 'Creating...' : 'Create Enhanced GRN'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
