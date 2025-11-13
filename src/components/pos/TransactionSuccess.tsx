import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CheckCircle, Eye, EyeOff, Trash2 } from 'lucide-react';
import { getTransactionInventorySync } from '@/services/inventory/inventorySyncQuery';
import TransactionInventoryDetails from '@/components/inventory/TransactionInventoryDetails';
import { deleteTransaction } from '@/services/transactions/transactionDeletionService';
import { useNavigate } from 'react-router-dom';

interface TransactionSuccessProps {
  transactionId: string;
  total: number;
  onNewTransaction: () => void;
  receiptNumber?: string;
}

export const TransactionSuccess = ({ transactionId, total, onNewTransaction, receiptNumber }: TransactionSuccessProps) => {
  const navigate = useNavigate();
  const [showInventoryDetails, setShowInventoryDetails] = useState(false);
  const [syncSummary, setSyncSummary] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchSyncSummary = async () => {
      const summary = await getTransactionInventorySync(transactionId);
      setSyncSummary(summary);
    };

    if (transactionId) {
      fetchSyncSummary();
    }
  }, [transactionId]);

  const handleDeleteTransaction = async () => {
    if (!receiptNumber) {
      console.error('No receipt number provided');
      return;
    }

    setIsDeleting(true);
    console.log(`🗑️ Deleting transaction: ${receiptNumber}`);

    const result = await deleteTransaction(transactionId, receiptNumber);

    if (result.success) {
      console.log(`✅ Transaction deleted successfully. Inventory items reversed: ${result.inventoryReversed}`);
      // Navigate back to POS
      navigate('/pos');
    } else {
      console.error(`❌ Failed to delete transaction: ${result.error}`);
    }

    setIsDeleting(false);
  };

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

          <div className="flex gap-2">
            <Button onClick={onNewTransaction} className="flex-1">
              New Transaction
            </Button>
            
            {receiptNumber && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="icon" disabled={isDeleting}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Transaction?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete transaction <strong>{receiptNumber}</strong> and reverse all inventory deductions.
                      <br /><br />
                      <strong>This action cannot be undone.</strong>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleDeleteTransaction}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete Transaction
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Inventory Details */}
      {showInventoryDetails && (
        <TransactionInventoryDetails transactionId={transactionId} />
      )}
    </div>
  );
};