
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, Search, CheckCircle, XCircle, Eye, RefreshCw } from 'lucide-react';
import { GRNDiscrepancyResolution } from '@/types/orderManagement';
import { 
  fetchDiscrepancyResolutions, 
  approveDiscrepancyResolution, 
  completeDiscrepancyResolution, 
  rejectDiscrepancyResolution 
} from '@/services/orderManagement/discrepancyResolutionService';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export function AdminDiscrepancyResolutions() {
  const [resolutions, setResolutions] = useState<GRNDiscrepancyResolution[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [rejectDialog, setRejectDialog] = useState<{ isOpen: boolean; resolutionId: string }>({ isOpen: false, resolutionId: '' });
  const [rejectionReason, setRejectionReason] = useState('');

  const loadResolutions = async () => {
    setLoading(true);
    const data = await fetchDiscrepancyResolutions();
    setResolutions(data);
    setLoading(false);
  };

  useEffect(() => {
    loadResolutions();
  }, []);

  const filteredResolutions = resolutions.filter(resolution =>
    resolution.grn?.grn_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    resolution.purchase_order?.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    resolution.purchase_order?.store?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleApprove = async (resolutionId: string) => {
    const success = await approveDiscrepancyResolution(resolutionId);
    if (success) {
      await loadResolutions();
    }
  };

  const handleComplete = async (resolutionId: string, purchaseOrderId: string, resolutionType: 'replace' | 'refund') => {
    const success = await completeDiscrepancyResolution(resolutionId, purchaseOrderId, resolutionType);
    if (success) {
      await loadResolutions();
    }
  };

  const handleReject = async () => {
    const success = await rejectDiscrepancyResolution(rejectDialog.resolutionId, rejectionReason);
    if (success) {
      setRejectDialog({ isOpen: false, resolutionId: '' });
      setRejectionReason('');
      await loadResolutions();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-orange-500" />
            Discrepancy Resolutions
          </h2>
          <p className="text-muted-foreground">
            Manage replacement and refund requests for GRN discrepancies
          </p>
        </div>
        <Button onClick={loadResolutions} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Resolution Requests</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by GRN, Order, or Store..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
              <span>Loading resolutions...</span>
            </div>
          ) : filteredResolutions.length === 0 ? (
            <div className="text-center py-12">
              <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No discrepancy resolutions found</h3>
              <p className="text-gray-500">No resolution requests match your search criteria.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>GRN Number</TableHead>
                  <TableHead>Order Number</TableHead>
                  <TableHead>Store</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Financial Adjustment</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredResolutions.map((resolution) => (
                  <TableRow key={resolution.id}>
                    <TableCell className="font-medium">
                      {resolution.grn?.grn_number || 'N/A'}
                    </TableCell>
                    <TableCell>
                      {resolution.purchase_order?.order_number || 'N/A'}
                    </TableCell>
                    <TableCell>
                      {resolution.purchase_order?.store?.name || 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={resolution.resolution_type === 'replace' ? 'default' : 'secondary'}>
                        {resolution.resolution_type === 'replace' ? 'Replace' : 'Refund'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(resolution.resolution_status)}>
                        {resolution.resolution_status.charAt(0).toUpperCase() + resolution.resolution_status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      ₱{resolution.financial_adjustment?.toLocaleString() || '0'}
                    </TableCell>
                    <TableCell>
                      {new Date(resolution.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {resolution.resolution_status === 'pending' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleApprove(resolution.id)}
                              className="text-green-600 hover:bg-green-50"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setRejectDialog({ isOpen: true, resolutionId: resolution.id })}
                              className="text-red-600 hover:bg-red-50"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {resolution.resolution_status === 'approved' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleComplete(resolution.id, resolution.purchase_order_id, resolution.resolution_type)}
                            className="text-blue-600 hover:bg-blue-50"
                          >
                            Complete
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={rejectDialog.isOpen} onOpenChange={(open) => setRejectDialog(prev => ({ ...prev, isOpen: open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Resolution Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="rejectionReason">Rejection Reason</Label>
              <Textarea
                id="rejectionReason"
                placeholder="Please provide a reason for rejecting this resolution request..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setRejectDialog({ isOpen: false, resolutionId: '' });
              setRejectionReason('');
            }}>
              Cancel
            </Button>
            <Button onClick={handleReject} className="bg-red-600 hover:bg-red-700">
              Reject Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
