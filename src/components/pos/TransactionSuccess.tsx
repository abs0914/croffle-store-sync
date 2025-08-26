import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, Eye, EyeOff } from 'lucide-react';
import { getTransactionInventorySync } from '@/services/inventory/inventorySyncQuery';
import TransactionInventoryDetails from '@/components/inventory/TransactionInventoryDetails';

interface TransactionSuccessProps {
  transactionId: string;
  total: number;
  onNewTransaction: () => void;
}

export const TransactionSuccess = ({ transactionId, total, onNewTransaction }: TransactionSuccessProps) => {
  const [showInventoryDetails, setShowInventoryDetails] = useState(false);
  const [syncSummary, setSyncSummary] = useState<any>(null);

  useEffect(() => {
    const fetchSyncSummary = async () => {
      const summary = await getTransactionInventorySync(transactionId);
      setSyncSummary(summary);
    };

    if (transactionId) {
      fetchSyncSummary();
    }
  }, [transactionId]);

  return (
    <div className="space-y-6">
      {/* Main Success Card */}
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-green-600">
            Transaction Successful!
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div>
            <p className="text-3xl font-bold">₱{total.toFixed(2)}</p>
            <p className="text-muted-foreground">Transaction ID: {transactionId}</p>
          </div>

          {/* Inventory Sync Summary */}
          {syncSummary && (
            <div className="flex items-center justify-center gap-2">
              <Badge variant={syncSummary.sync_status === 'success' ? 'default' : 'destructive'}>
                {syncSummary.sync_status === 'success' ? 'Inventory Updated' : 'Inventory Sync Failed'}
              </Badge>
              {syncSummary.affected_inventory_items?.length > 0 && (
                <Badge variant="outline">
                  {syncSummary.affected_inventory_items.length} items affected
                </Badge>
              )}
            </div>
          )}

          {/* Toggle Inventory Details */}
          {syncSummary && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowInventoryDetails(!showInventoryDetails)}
              className="flex items-center gap-2"
            >
              {showInventoryDetails ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showInventoryDetails ? 'Hide' : 'Show'} Inventory Details
            </Button>
          )}

          <Button onClick={onNewTransaction} className="w-full">
            New Transaction
          </Button>
        </CardContent>
      </Card>

      {/* Inventory Details */}
      {showInventoryDetails && (
        <TransactionInventoryDetails transactionId={transactionId} />
      )}
    </div>
  );
};