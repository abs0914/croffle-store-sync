
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Package2, CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { GoodsReceivedNote } from '@/types/orderManagement';
import { CreateDiscrepancyResolutionDialog } from './CreateDiscrepancyResolutionDialog';
import { updateInventoryFromGRN } from '@/services/orderManagement/inventoryUpdateService';
import { toast } from 'sonner';

interface EnhancedViewGRNDialogProps {
  grn: GoodsReceivedNote;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EnhancedViewGRNDialog({ grn, open, onOpenChange }: EnhancedViewGRNDialogProps) {
  const [showDiscrepancyDialog, setShowDiscrepancyDialog] = useState(false);
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

  const getQualityIcon = (status?: string) => {
    switch (status) {
      case 'good':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'damaged':
      case 'partial':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'missing':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <CheckCircle className="h-4 w-4 text-green-600" />;
    }
  };

  const getQualityStatusColor = (status?: string) => {
    switch (status) {
      case 'good':
        return 'text-green-600';
      case 'damaged':
      case 'partial':
        return 'text-yellow-600';
      case 'missing':
        return 'text-red-600';
      default:
        return 'text-green-600';
    }
  };

  const hasItemDiscrepancies = grn.items?.some(item => 
    item.quality_status !== 'good' || 
    item.received_quantity < item.ordered_quantity
  );

  const goodItemsCount = grn.items?.filter(item => item.quality_status === 'good').length || 0;
  const totalItems = grn.items?.length || grn.purchase_order?.items?.length || 0;

  const getOverallQualityIcon = () => {
    if (grn.quality_check_passed === true) return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (grn.quality_check_passed === false) return <XCircle className="h-4 w-4 text-red-600" />;
    return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package2 className="h-5 w-5" />
              Enhanced GRN Details
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
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
                    {hasItemDiscrepancies && (
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
                    <p className="text-sm font-medium">Items Summary</p>
                    <p className="text-sm text-muted-foreground">
                      {goodItemsCount} of {totalItems} items in good condition
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">Overall Quality Check:</p>
                  {getOverallQualityIcon()}
                  <span className="text-sm">
                    {grn.quality_check_passed === null ? 'Not specified' : 
                     grn.quality_check_passed ? 'Passed' : 'Failed'}
                  </span>
                </div>

                {grn.digital_signature && (
                  <div>
                    <p className="text-sm font-medium">Digital Signature</p>
                    <p className="text-sm text-muted-foreground">{grn.digital_signature}</p>
                  </div>
                )}

                {grn.remarks && (
                  <div>
                    <p className="text-sm font-medium">Overall Remarks</p>
                    <p className="text-sm text-muted-foreground">{grn.remarks}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Item-Level Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>Item-Level Inspection Results</span>
                  <div className="flex gap-2 text-sm">
                    <Badge variant="outline" className="text-green-600">
                      Good: {goodItemsCount}
                    </Badge>
                    <Badge variant="outline">
                      Total: {totalItems}
                    </Badge>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {grn.items && grn.items.length > 0 ? (
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
                      {grn.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">
                            {item.purchase_order_item?.inventory_stock?.item || 'Unknown Item'}
                          </TableCell>
                          <TableCell>{item.ordered_quantity}</TableCell>
                          <TableCell>
                            <span className={item.received_quantity < item.ordered_quantity ? 'text-yellow-600' : ''}>
                              {item.received_quantity}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getQualityIcon(item.quality_status)}
                              <span className={`text-sm capitalize ${getQualityStatusColor(item.quality_status)}`}>
                                {item.quality_status || 'good'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">
                              {item.item_remarks || '-'}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    No item-level details available. This GRN was created with the basic system.
                  </div>
                )}
              </CardContent>
            </Card>
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
