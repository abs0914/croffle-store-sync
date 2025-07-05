import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package2, CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { GoodsReceivedNote } from '@/types/orderManagement';
import { CreateDiscrepancyResolutionDialog } from './CreateDiscrepancyResolutionDialog';
import { updateInventoryFromGRN } from '@/services/orderManagement/inventoryUpdateService';
import { toast } from 'sonner';

interface ViewGRNDialogProps {
  grn: GoodsReceivedNote;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ViewGRNDialog({ grn, open, onOpenChange }: ViewGRNDialogProps) {
  const [isUpdatingInventory, setIsUpdatingInventory] = useState(false);

  const handleUpdateInventory = async () => {
    setIsUpdatingInventory(true);
    try {
      const result = await updateInventoryFromGRN(grn);
      if (result.success) {
        toast.success(`Inventory updated for ${result.updatedItems.length} items`);
      } else {
        toast.error(`Inventory update failed: ${result.errors.join(', ')}`);
      }
    } catch (error) {
      toast.error('Failed to update inventory');
    } finally {
      setIsUpdatingInventory(false);
    }
  };
  const [showDiscrepancyDialog, setShowDiscrepancyDialog] = useState(false);

  const getQualityIcon = () => {
    if (grn.quality_check_passed === true) return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (grn.quality_check_passed === false) return <XCircle className="h-4 w-4 text-red-600" />;
    return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
  };

  const hasDiscrepancies = grn.quality_check_passed === false || grn.remarks?.toLowerCase().includes('discrepancy');

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Package2 className="h-5 w-5" />
              Goods Received Note Details
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>{grn.grn_number}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="default">Completed</Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleUpdateInventory}
                      disabled={isUpdatingInventory}
                      className="text-blue-600 hover:bg-blue-50"
                    >
                      <RefreshCw className={`h-4 w-4 mr-1 ${isUpdatingInventory ? 'animate-spin' : ''}`} />
                      Update Inventory
                    </Button>
                    {hasDiscrepancies && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowDiscrepancyDialog(true)}
                        className="text-orange-600 hover:bg-orange-50"
                      >
                        <AlertTriangle className="h-4 w-4 mr-1" />
                        Process Discrepancy
                      </Button>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Purchase Order</p>
                    <p className="text-sm text-muted-foreground">
                      {grn.purchase_order?.order_number || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Store</p>
                    <p className="text-sm text-muted-foreground">
                      {grn.purchase_order?.store?.name || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Received Date</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(grn.received_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Total Items</p>
                    <p className="text-sm text-muted-foreground">
                      {grn.purchase_order?.items?.length || 0}
                    </p>
                  </div>
                </div>

                {grn.quality_check_passed !== null && (
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">Quality Check:</p>
                    {getQualityIcon()}
                    <span className="text-sm">
                      {grn.quality_check_passed ? 'Passed' : 'Failed'}
                    </span>
                  </div>
                )}

                {grn.digital_signature && (
                  <div>
                    <p className="text-sm font-medium">Digital Signature</p>
                    <p className="text-sm text-muted-foreground">{grn.digital_signature}</p>
                  </div>
                )}

                {grn.remarks && (
                  <div>
                    <p className="text-sm font-medium">Remarks</p>
                    <p className="text-sm text-muted-foreground">{grn.remarks}</p>
                    {hasDiscrepancies && (
                      <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded">
                        <p className="text-sm text-orange-800">
                          ⚠️ This GRN contains discrepancies that may require resolution.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {grn.purchase_order?.items && grn.purchase_order.items.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Items Received</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {grn.purchase_order.items.map((item, index) => (
                      <div key={item.id} className="flex justify-between items-center p-2 border rounded">
                        <div>
                          <p className="font-medium">{item.inventory_stock?.item || `Item ${index + 1}`}</p>
                          <p className="text-sm text-muted-foreground">
                            Unit: {item.inventory_stock?.unit || 'N/A'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">Qty: {item.quantity}</p>
                          {item.unit_price && (
                            <p className="text-sm text-muted-foreground">
                              ₱{item.unit_price.toFixed(2)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <CreateDiscrepancyResolutionDialog
        open={showDiscrepancyDialog}
        onOpenChange={setShowDiscrepancyDialog}
        grn={grn}
        onSuccess={() => {
          setShowDiscrepancyDialog(false);
          // Could add a callback here to refresh parent data if needed
        }}
      />
    </>
  );
}
