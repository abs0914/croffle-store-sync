import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Receipt, Printer } from 'lucide-react';
import CompletedTransaction from '@/components/pos/CompletedTransaction';
import { Transaction, Customer } from '@/types';
import { toast } from 'sonner';

export default function Invoice() {
  const { transactionId } = useParams<{ transactionId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get transaction data from navigation state (immediate access)
  const [transaction, setTransaction] = useState<Transaction | null>(
    location.state?.transaction || null
  );
  const [customer, setCustomer] = useState<Customer | null>(
    location.state?.customer || null
  );

  useEffect(() => {
    // If no transaction data was passed through navigation state, redirect to POS
    if (!transaction && !transactionId) {
      toast.error("No transaction data found");
      navigate('/pos', { replace: true });
      return;
    }

    // TODO: If transactionId is provided but no transaction state, 
    // we could fetch transaction data from the backend here
    if (transactionId && !transaction) {
      console.log("Transaction ID provided, could fetch from backend:", transactionId);
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
      <div className="bg-card border-b border-border shadow-sm p-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToPOS}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to POS
            </Button>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Receipt className="h-4 w-4" />
              <span className="text-sm font-medium">Invoice #{transaction.receiptNumber}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="flex items-center gap-2"
            >
              <Printer className="h-4 w-4" />
              Print
            </Button>
            <Button onClick={handleNewSale}>
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