
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertTriangle, Package, FileText, TrendingUp } from 'lucide-react';
import { 
  DamagedGoodsRecord, 
  DamagedGoodsReport,
  getPendingDamageDispositions,
  updateDamageDisposition,
  generateDamagedGoodsReport
} from '@/services/orderManagement/damagedGoodsService';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth';

export const DamagedGoodsManagement: React.FC = () => {
  const { user } = useAuth();
  const [pendingItems, setPendingItems] = useState<DamagedGoodsRecord[]>([]);
  const [selectedItem, setSelectedItem] = useState<DamagedGoodsRecord | null>(null);
  const [disposition, setDisposition] = useState<DamagedGoodsRecord['disposition']>('pending');
  const [dispositionNotes, setDispositionNotes] = useState('');
  const [isDispositionDialogOpen, setIsDispositionDialogOpen] = useState(false);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [damagedGoodsReport, setDamagedGoodsReport] = useState<DamagedGoodsReport | null>(null);
  const [loading, setLoading] = useState(true);

  const storeId = user?.storeIds?.[0];

  useEffect(() => {
    loadPendingItems();
  }, [storeId]);

  const loadPendingItems = async () => {
    if (!storeId) return;
    
    setLoading(true);
    try {
      const items = await getPendingDamageDispositions(storeId);
      setPendingItems(items);
    } catch (error) {
      console.error('Error loading pending items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDispositionUpdate = async () => {
    if (!selectedItem || !user?.id) return;

    const success = await updateDamageDisposition(
      selectedItem.id,
      disposition,
      dispositionNotes,
      user.id
    );

    if (success) {
      setIsDispositionDialogOpen(false);
      setSelectedItem(null);
      setDisposition('pending');
      setDispositionNotes('');
      await loadPendingItems();
    }
  };

  const generateReport = async () => {
    if (!storeId) return;

    const endDate = new Date().toISOString();
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(); // Last 30 days

    const report = await generateDamagedGoodsReport(startDate, endDate, storeId);
    if (report) {
      setDamagedGoodsReport(report);
      setIsReportDialogOpen(true);
    }
  };

  const getDispositionColor = (disposition: string) => {
    switch (disposition) {
      case 'pending': return 'secondary';
      case 'return_to_supplier': return 'default';
      case 'dispose': return 'destructive';
      case 'partial_use': return 'outline'; // Changed from 'warning' to 'outline'
      default: return 'secondary';
    }
  };

  const formatDisposition = (disposition: string) => {
    return disposition.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Damaged Goods Management</h2>
          <p className="text-muted-foreground">Manage damaged items and track financial impact</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={generateReport}>
            <TrendingUp className="h-4 w-4 mr-2" />
            Generate Report
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <div className="text-sm text-muted-foreground">Pending Items</div>
            </div>
            <div className="text-2xl font-bold">{pendingItems.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Total Impact</div>
            <div className="text-2xl font-bold text-red-600">
              ₱{pendingItems.reduce((sum, item) => sum + item.financial_impact, 0).toFixed(2)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Avg. Impact per Item</div>
            <div className="text-2xl font-bold">
              ₱{pendingItems.length > 0 ? (pendingItems.reduce((sum, item) => sum + item.financial_impact, 0) / pendingItems.length).toFixed(2) : '0.00'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Items List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Pending Disposition Items
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-16 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          ) : pendingItems.length === 0 ? (
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-muted-foreground">No pending damaged items</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingItems.map((item) => (
                <div key={item.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{item.item_name}</h3>
                        <Badge variant={getDispositionColor(item.disposition)}>
                          {formatDisposition(item.disposition)}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Quantity:</span>
                          <span className="ml-2 font-medium">{item.damaged_quantity}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Impact:</span>
                          <span className="ml-2 font-medium text-red-600">₱{item.financial_impact.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Reason:</span>
                          <span className="ml-2">{item.damage_reason}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Date:</span>
                          <span className="ml-2">{new Date(item.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedItem(item);
                        setDisposition(item.disposition);
                        setIsDispositionDialogOpen(true);
                      }}
                    >
                      Update Disposition
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Disposition Update Dialog */}
      <Dialog open={isDispositionDialogOpen} onOpenChange={setIsDispositionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Damage Disposition</DialogTitle>
          </DialogHeader>
          
          {selectedItem && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium">{selectedItem.item_name}</h4>
                <p className="text-sm text-muted-foreground">
                  {selectedItem.damaged_quantity} units • ₱{selectedItem.financial_impact.toFixed(2)} impact
                </p>
                <p className="text-sm mt-1">{selectedItem.damage_reason}</p>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Disposition</label>
                <Select value={disposition} onValueChange={(value: any) => setDisposition(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="return_to_supplier">Return to Supplier</SelectItem>
                    <SelectItem value="dispose">Dispose</SelectItem>
                    <SelectItem value="partial_use">Partial Use</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Notes</label>
                <Textarea
                  placeholder="Add notes about the disposition..."
                  value={dispositionNotes}
                  onChange={(e) => setDispositionNotes(e.target.value)}
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDispositionDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleDispositionUpdate}>
                  Update Disposition
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Report Dialog */}
      <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Damaged Goods Report
            </DialogTitle>
          </DialogHeader>
          
          {damagedGoodsReport && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground">Total Incidents</div>
                    <div className="text-2xl font-bold">{damagedGoodsReport.summary.total_incidents}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground">Damaged Items</div>
                    <div className="text-2xl font-bold">{damagedGoodsReport.summary.total_damaged_items}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground">Financial Impact</div>
                    <div className="text-2xl font-bold text-red-600">₱{damagedGoodsReport.summary.total_financial_impact.toFixed(2)}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Trending Issues */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Top Damage Causes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {damagedGoodsReport.trending_issues.slice(0, 5).map((issue, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <span className="text-sm">{issue.issue}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{issue.frequency}x</Badge>
                          <span className="text-sm font-medium text-red-600">₱{issue.impact.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsReportDialogOpen(false)}>Close</Button>
            <Button>Export Report</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
