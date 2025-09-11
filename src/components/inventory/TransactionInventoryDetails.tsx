import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, XCircle, Clock } from 'lucide-react';
import { formatDateTime } from '@/utils/format';

interface AffectedInventoryItem {
  item_name: string;
  item_id: string;
  unit: string;
  quantity_deducted: number;
  previous_stock: number;
  new_stock: number;
  deduction_type: 'direct' | 'recipe_ingredient';
}

interface TransactionInventoryDetailsProps {
  transactionId: string;
}

export const TransactionInventoryDetails = ({ transactionId }: TransactionInventoryDetailsProps) => {
  const [syncData, setSyncData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSyncData = async () => {
      try {
        const { data, error } = await supabase
          .from('inventory_sync_audit')
          .select('*')
          .eq('transaction_id', transactionId)
          .maybeSingle();

        if (error) {
          console.error('Error fetching sync data:', error);
          return;
        }

        setSyncData(data);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    if (transactionId) {
      fetchSyncData();
    }
  }, [transactionId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Loading inventory sync details...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (!syncData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Inventory Sync</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No inventory sync data found for this transaction.</p>
        </CardContent>
      </Card>
    );
  }

  const affectedItems: AffectedInventoryItem[] = syncData.affected_inventory_items || [];
  const isSuccess = syncData.sync_status === 'success';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isSuccess ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <XCircle className="h-4 w-4 text-red-600" />
          )}
          Inventory Sync Details
          <Badge variant={isSuccess ? 'default' : 'destructive'}>
            {syncData.sync_status}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Sync Summary */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Items Processed:</span> {syncData.items_processed || 0}
          </div>
          <div>
            <span className="font-medium">Duration:</span> {syncData.sync_duration_ms || 0}ms
          </div>
        </div>

        {/* Error Details */}
        {syncData.error_details && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <p className="text-sm font-medium text-destructive">Error:</p>
            <p className="text-sm text-destructive/80">{syncData.error_details}</p>
          </div>
        )}

        {/* Affected Inventory Items */}
        {affectedItems.length > 0 && (
          <div>
            <h4 className="font-medium mb-3">Affected Inventory Items</h4>
            <div className="space-y-2">
              {affectedItems.map((item, index) => (
                <div key={index} className="p-3 bg-muted/50 rounded-md border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{item.item_name}</span>
                    <Badge variant="outline">
                      {item.deduction_type === 'direct' ? 'Direct Product' : 'Recipe Ingredient'}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-sm text-muted-foreground">
                    <div>
                      <span className="font-medium">Deducted:</span> {item.quantity_deducted} {item.unit}
                    </div>
                    <div>
                      <span className="font-medium">Previous:</span> {item.previous_stock} {item.unit}
                    </div>
                    <div>
                      <span className="font-medium">New Stock:</span> {item.new_stock} {item.unit}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <Separator />
        
        <p className="text-xs text-muted-foreground">
          Sync completed on {formatDateTime(syncData.created_at)}
        </p>
      </CardContent>
    </Card>
  );
};

export default TransactionInventoryDetails;