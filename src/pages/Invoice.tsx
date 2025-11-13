import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
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
import { ArrowLeft, Receipt, Printer, Trash2 } from 'lucide-react';
import CompletedTransaction from '@/components/pos/CompletedTransaction';
import { Transaction, Customer } from '@/types';
import { toast } from 'sonner';
import { deleteTransaction } from '@/services/transactions/transactionDeletionService';

export default function Invoice() {
  const { transactionId } = useParams<{ transactionId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  
  console.log("🧾 Invoice page loaded with:", {
    transactionId,
    hasLocationState: !!location.state,
    stateKeys: location.state ? Object.keys(location.state) : []
  });
  
  // Get transaction data from navigation state (immediate access)
  const [transaction, setTransaction] = useState<Transaction | null>(
    location.state?.transaction || null
  );
  const [customer, setCustomer] = useState<Customer | null>(
    location.state?.customer || null
  );
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    console.log("🔍 Invoice useEffect - checking transaction data:", {
      hasTransaction: !!transaction,
      hasTransactionId: !!transactionId,
      transactionData: transaction ? {
        id: transaction.id,
        receiptNumber: transaction.receiptNumber,
        total: transaction.total
      } : null
    });

    // If no transaction data was passed through navigation state, redirect to POS
    if (!transaction && !transactionId) {
      console.log("❌ No transaction data found, redirecting to POS");
      toast.error("No transaction data found");
      navigate('/pos', { replace: true });
      return;
    }

    // TODO: If transactionId is provided but no transaction state, 
    // we could fetch transaction data from the backend here
    if (transactionId && !transaction) {
      console.log("🔄 Transaction ID provided but no state, could fetch from backend:", transactionId);
      // For now, redirect to POS if no state was passed
      toast.error("Transaction data not available");
      navigate('/pos', { replace: true });
    }
  }, [transaction, transactionId, navigate]);

  const handleNewSale = () => {
    navigate('/pos', { replace: true });
  };

  const handleBackToPOS = () => {
    navigate('/pos');
  };

  const handleDeleteTransaction = async () => {
    if (!transaction?.receiptNumber) {
      toast.error('No receipt number found');
      return;
    }

    setIsDeleting(true);
    console.log(`🗑️ Deleting transaction: ${transaction.receiptNumber}`);

    const result = await deleteTransaction(
      transaction.id || transactionId || '', 
      transaction.receiptNumber
    );

    if (result.success) {
      console.log(`✅ Transaction deleted successfully. Inventory items reversed: ${result.inventoryReversed}`);
      toast.success(`Transaction ${transaction.receiptNumber} deleted and inventory restored`);
      // Navigate back to POS
      navigate('/pos', { replace: true });
    } else {
      console.error(`❌ Failed to delete transaction: ${result.error}`);
      toast.error(`Failed to delete transaction: ${result.error}`);
    }

    setIsDeleting(false);
  };

  if (!transaction) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border shadow-sm p-3 md:p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between max-w-4xl mx-auto">
          {/* Left section - Back button and title */}
          <div className="flex items-center gap-3 md:gap-4 min-w-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToPOS}
              className="flex items-center gap-2 shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back to POS</span>
              <span className="sm:hidden">Back</span>
            </Button>
            <div className="flex items-center gap-2 text-muted-foreground min-w-0">
              <Receipt className="h-4 w-4 shrink-0" />
              <span className="text-sm font-medium truncate">
                Invoice #{transaction.receiptNumber}
              </span>
            </div>
          </div>
          
          {/* Right section - Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={isDeleting}
                  className="flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Delete</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Transaction?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete transaction <strong>#{transaction.receiptNumber}</strong> and reverse all inventory deductions.
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
                    {isDeleting ? 'Deleting...' : 'Delete Transaction'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="flex items-center gap-2"
            >
              <Printer className="h-4 w-4" />
              <span className="hidden sm:inline">Print</span>
            </Button>
            <Button onClick={handleNewSale} className="whitespace-nowrap">
              New Sale
            </Button>
          </div>
        </div>
      </div>

      {/* Invoice Content */}
      <div className="max-w-4xl mx-auto p-4">
        <CompletedTransaction
          transaction={transaction}
          customer={customer}
          startNewSale={handleNewSale}
        />
      </div>
    </div>
  );
}