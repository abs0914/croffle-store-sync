
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Eye, AlertTriangle } from 'lucide-react';
import { GoodsReceivedNote, PurchaseOrder } from '@/types/orderManagement';
import { fetchGRNs, fetchAvailableOrdersForGRN } from '@/services/orderManagement/grnService';
import { useAuth } from '@/contexts/auth';
import { CreateGRNDialog } from './CreateGRNDialog';
import { ViewGRNDialog } from './ViewGRNDialog';

export function GRNTab() {
  const { user } = useAuth();
  const [grns, setGrns] = useState<GoodsReceivedNote[]>([]);
  const [availableOrders, setAvailableOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [viewingGRN, setViewingGRN] = useState<GoodsReceivedNote | null>(null);

  const loadData = async () => {
    if (!user?.storeIds?.[0]) return;
    
    setLoading(true);
    const [grnData, ordersData] = await Promise.all([
      fetchGRNs(user.storeIds[0]),
      fetchAvailableOrdersForGRN(user.storeIds[0])
    ]);
    
    setGrns(grnData);
    setAvailableOrders(ordersData);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const filteredGRNs = grns.filter(grn =>
    grn.grn_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    grn.purchase_order?.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    grn.remarks?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateSuccess = () => {
    loadData();
    setShowCreateDialog(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Goods Received Notes</CardTitle>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create GRN
          </Button>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search GRNs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardHeader>
      
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-20 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        ) : filteredGRNs.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              {searchTerm ? 'No GRNs found matching your search' : 'No goods received notes created yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredGRNs.map((grn) => (
              <div key={grn.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{grn.grn_number}</h3>
                      <Badge variant="default">Completed</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Purchase Order: {grn.purchase_order?.order_number || 'N/A'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Items: {grn.purchase_order?.items?.length || 0}
                    </p>
                    {grn.quality_check_passed !== null && (
                      <p className="text-sm">
                        Quality Check: {grn.quality_check_passed ? '✅ Passed' : '❌ Failed'}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setViewingGRN(grn)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {grn.quality_check_passed === false && (
                      <Button variant="outline" size="sm" className="text-yellow-600">
                        <AlertTriangle className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                
                {grn.remarks && (
                  <p className="text-sm">{grn.remarks}</p>
                )}
                
                <div className="text-xs text-muted-foreground">
                  Received: {new Date(grn.received_at).toLocaleDateString()}
                  {grn.digital_signature && (
                    <span className="ml-4">Signed by: {grn.digital_signature}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      
      <CreateGRNDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        availableOrders={availableOrders}
        onSuccess={handleCreateSuccess}
      />

      {viewingGRN && (
        <ViewGRNDialog
          grn={viewingGRN}
          open={!!viewingGRN}
          onOpenChange={(open) => !open && setViewingGRN(null)}
        />
      )}
    </Card>
  );
}
