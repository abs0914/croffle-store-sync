
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import ReceiptGenerator from "./ReceiptGenerator";
import { Transaction, Customer } from "@/types";
import { useThermalPrinter } from "@/hooks/useThermalPrinter";
import { useStore } from "@/contexts/StoreContext";
import { useEffect, useState } from "react";
import { CheckCircle, Printer } from "lucide-react";

interface CompletedTransactionProps {
  transaction: Transaction;
  customer: Customer | null;
  startNewSale: () => void;
}

export default function CompletedTransaction({
  transaction,
  customer,
  startNewSale
}: CompletedTransactionProps) {
  const { isConnected, printReceipt } = useThermalPrinter();
  const { currentStore } = useStore();
  const [countdown, setCountdown] = useState(3);
  const [showBriefSuccess, setShowBriefSuccess] = useState(false);

  // Automatically print receipt when transaction completes and printer is connected
  useEffect(() => {
    let hasTriggered = false; // Prevent multiple prints

    const autoPrint = async () => {
      if (isConnected && transaction && !hasTriggered) {
        hasTriggered = true;
        try {
          console.log('Auto-printing receipt to thermal printer...');
          await printReceipt(transaction, customer, currentStore, 'Cashier');
          
          // Show brief success message and start countdown for auto-navigation
          setShowBriefSuccess(true);
        } catch (error) {
          console.error('Auto-print failed:', error);
          // Don't show error to user, just skip auto-print
        }
      }
    };

    // Small delay to ensure transaction is fully processed
    const timer = setTimeout(autoPrint, 1000);
    return () => clearTimeout(timer);
  }, [isConnected, transaction?.receiptNumber]); // Only depend on essential values

  // Auto-navigation countdown when printer is connected
  useEffect(() => {
    if (showBriefSuccess && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (showBriefSuccess && countdown === 0) {
      startNewSale();
    }
  }, [showBriefSuccess, countdown, startNewSale]);

  // Show brief success message if thermal printer is connected
  if (isConnected && showBriefSuccess) {
    return (
      <div className="flex flex-col items-center justify-center h-full max-w-md mx-auto">
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          
          <div>
            <h1 className="text-2xl font-bold text-green-600 mb-2">Payment Complete!</h1>
            <p className="text-gray-600 mb-2">Transaction #{transaction.receiptNumber}</p>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Printer className="h-4 w-4" />
              <span>Receipt printed</span>
            </div>
          </div>
          
          <div className="text-sm text-muted-foreground">
            Returning to POS in {countdown}s...
          </div>
          
          <Button 
            onClick={startNewSale}
            variant="outline"
            className="mt-4"
          >
            Continue Now
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full max-w-md mx-auto">
      <div className="w-full text-center mb-6">
        <h1 className="text-2xl font-bold mb-2 text-green-600">Sale Complete!</h1>
        <p className="text-gray-600 mb-4">Transaction #{transaction.receiptNumber}</p>
      </div>
      
      <Card className="w-full mb-6">
        <CardContent className="p-4">
          <ReceiptGenerator 
            transaction={transaction}
            customer={customer}
          />
        </CardContent>
      </Card>
      
      <Button 
        onClick={startNewSale}
        className="w-full py-6 text-lg"
      >
        New Sale
      </Button>
    </div>
  );
}
