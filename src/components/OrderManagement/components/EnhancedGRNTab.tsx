
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Package, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

interface GRNItem {
  id: string;
  item_name: string;
  ordered_quantity: number;
  received_quantity: number;
  damaged_quantity: number;
  good_quantity: number;
  quality_status: 'good' | 'damaged' | 'partial_damage';
  damage_reason?: string;
  financial_impact: number;
  unit_cost: number;
}

interface DamagedGoodsReport {
  total_damaged_items: number;
  total_financial_impact: number;
  damage_categories: Record<string, number>;
  supplier_id: string;
  grn_id: string;
}

export const EnhancedGRNTab: React.FC = () => {
  const [grnItems, setGrnItems] = useState<GRNItem[]>([]);
  const [isProcessingGRN, setIsProcessingGRN] = useState(false);
  const [selectedGRN, setSelectedGRN] = useState<string>('');
  const [isDamageReportOpen, setIsDamageReportOpen] = useState(false);
  const [damagedGoodsReport, setDamagedGoodsReport] = useState<DamagedGoodsReport | null>(null);

  const damageReasons = [
    'Physical damage during transport',
    'Expired or near expiry',
    'Poor packaging',
    'Temperature damage',
    'Contamination',
    'Wrong item received',
    'Quantity shortage',
    'Quality below standards',
    'Other'
  ];

  const updateGRNItem = (itemId: string, field: keyof GRNItem, value: any) => {
    setGrnItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const updatedItem = { ...item, [field]: value };
        
        // Auto-calculate good quantity and financial impact
        if (field === 'received_quantity' || field === 'damaged_quantity') {
          updatedItem.good_quantity = updatedItem.received_quantity - updatedItem.damaged_quantity;
          updatedItem.financial_impact = updatedItem.damaged_quantity * updatedItem.unit_cost;
          
          // Update quality status
          if (updatedItem.damaged_quantity === 0) {
            updatedItem.quality_status = 'good';
          } else if (updatedItem.damaged_quantity === updatedItem.received_quantity) {
            updatedItem.quality_status = 'damaged';
          } else {
            updatedItem.quality_status = 'partial_damage';
          }
        }
        
        return updatedItem;
      }
      return item;
    }));
  };

  const calculateTotalFinancialImpact = () => {
    return grnItems.reduce((total, item) => total + item.financial_impact, 0);
  };

  const generateDamagedGoodsReport = () => {
    const damagedItems = grnItems.filter(item => item.damaged_quantity > 0);
    const totalDamaged = damagedItems.reduce((sum, item) => sum + item.damaged_quantity, 0);
    const totalImpact = calculateTotalFinancialImpact();
    
    const damageCategories: Record<string, number> = {};
    damagedItems.forEach(item => {
      const reason = item.damage_reason || 'Unspecified';
      damageCategories[reason] = (damageCategories[reason] || 0) + item.financial_impact;
    });

    setDamagedGoodsReport({
      total_damaged_items: totalDamaged,
      total_financial_impact: totalImpact,
      damage_categories: damageCategories,
      supplier_id: 'current-supplier-id',
      grn_id: selectedGRN
    });
    
    setIsDamageReportOpen(true);
  };

  const processGRN = async () => {
    try {
      setIsProcessingGRN(true);
      
      // Process each item
      for (const item of grnItems) {
        // Update inventory with good quantity only
        await updateInventoryStock(item.id, item.good_quantity);
        
        // Record damaged goods if any
        if (item.damaged_quantity > 0) {
          await recordDamagedGoods(item);
        }
      }
      
      // Generate audit trail
      await createGRNAuditTrail(selectedGRN, grnItems);
      
      toast.success('GRN processed successfully with damaged goods tracking');
      
      // Show damage report if there are damaged items
      const hasDamagedItems = grnItems.some(item => item.damaged_quantity > 0);
      if (hasDamagedItems) {
        generateDamagedGoodsReport();
      }
      
    } catch (error) {
      console.error('Error processing GRN:', error);
      toast.error('Failed to process GRN');
    } finally {
      setIsProcessingGRN(false);
    }
  };

  const updateInventoryStock = async (itemId: string, quantity: number) => {
    // Implementation for updating inventory with good quantity
    console.log(`Updating inventory for item ${itemId} with quantity ${quantity}`);
  };

  const recordDamagedGoods = async (item: GRNItem) => {
    // Implementation for recording damaged goods
    console.log('Recording damaged goods:', {
      item_id: item.id,
      damaged_quantity: item.damaged_quantity,
      damage_reason: item.damage_reason,
      financial_impact: item.financial_impact
    });
  };

  const createGRNAuditTrail = async (grnId: string, items: GRNItem[]) => {
    // Implementation for creating audit trail
    console.log('Creating GRN audit trail for:', grnId, items);
  };

  const getQualityStatusIcon = (status: string) => {
    switch (status) {
      case 'good':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'damaged':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'partial_damage':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default:
        return <Package className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Enhanced Goods Received Notes</h2>
          <p className="text-muted-foreground">Process deliveries with comprehensive damaged goods tracking</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={generateDamagedGoodsReport}>
            <AlertTriangle className="h-4 w-4 mr-2" />
            Damage Report
          </Button>
          <Button onClick={processGRN} disabled={isProcessingGRN}>
            {isProcessingGRN ? 'Processing...' : 'Process GRN'}
          </Button>
        </div>
      </div>

      {/* Financial Impact Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Total Items</div>
            <div className="text-2xl font-bold">{grnItems.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Damaged Items</div>
            <div className="text-2xl font-bold text-red-600">
              {grnItems.filter(item => item.damaged_quantity > 0).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Financial Impact</div>
            <div className="text-2xl font-bold text-red-600">
              ₱{calculateTotalFinancialImpact().toFixed(2)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Success Rate</div>
            <div className="text-2xl font-bold text-green-600">
              {grnItems.length > 0 ? ((grnItems.filter(item => item.quality_status === 'good').length / grnItems.length) * 100).toFixed(1) : 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* GRN Items Table */}
      <Card className="flex flex-col max-h-[60vh]">
        <CardHeader className="flex-shrink-0">
          <CardTitle>Received Items Inspection</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0">
          <div className="overflow-auto max-h-full">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="min-w-[120px]">Item</TableHead>
                  <TableHead className="min-w-[80px]">Ordered</TableHead>
                  <TableHead className="min-w-[90px]">Received</TableHead>
                  <TableHead className="min-w-[90px]">Damaged</TableHead>
                  <TableHead className="min-w-[70px]">Good</TableHead>
                  <TableHead className="min-w-[100px]">Status</TableHead>
                  <TableHead className="min-w-[200px]">Damage Reason</TableHead>
                  <TableHead className="min-w-[100px]">Impact (₱)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grnItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.item_name}</TableCell>
                    <TableCell>{item.ordered_quantity}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={item.received_quantity}
                        onChange={(e) => updateGRNItem(item.id, 'received_quantity', Number(e.target.value))}
                        className="w-20"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={item.damaged_quantity}
                        onChange={(e) => updateGRNItem(item.id, 'damaged_quantity', Number(e.target.value))}
                        className="w-20"
                        max={item.received_quantity}
                      />
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.good_quantity}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getQualityStatusIcon(item.quality_status)}
                        <span className="text-sm capitalize">{item.quality_status.replace('_', ' ')}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.damaged_quantity > 0 && (
                        <Select value={item.damage_reason} onValueChange={(value) => updateGRNItem(item.id, 'damage_reason', value)}>
                          <SelectTrigger className="w-48">
                            <SelectValue placeholder="Select reason..." />
                          </SelectTrigger>
                          <SelectContent>
                            {damageReasons.map((reason) => (
                              <SelectItem key={reason} value={reason}>{reason}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={item.financial_impact > 0 ? "text-red-600 font-medium" : ""}>
                        ₱{item.financial_impact.toFixed(2)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Damaged Goods Report Dialog */}
      <Dialog open={isDamageReportOpen} onOpenChange={setIsDamageReportOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Damaged Goods Report
            </DialogTitle>
          </DialogHeader>
          
          {damagedGoodsReport && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground">Total Damaged Items</div>
                    <div className="text-2xl font-bold text-red-600">{damagedGoodsReport.total_damaged_items}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground">Financial Impact</div>
                    <div className="text-2xl font-bold text-red-600">₱{damagedGoodsReport.total_financial_impact.toFixed(2)}</div>
                  </CardContent>
                </Card>
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Damage Categories</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(damagedGoodsReport.damage_categories).map(([reason, impact]) => (
                      <div key={reason} className="flex justify-between items-center">
                        <span className="text-sm">{reason}</span>
                        <Badge variant="destructive">₱{impact.toFixed(2)}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsDamageReportOpen(false)}>Close</Button>
            <Button>Export Report</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
