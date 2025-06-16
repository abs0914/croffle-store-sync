
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import ReceiptGenerator from "./ReceiptGenerator";
import { Transaction, Customer } from "@/types";
import { useThermalPrinter } from "@/hooks/useThermalPrinter";
import { useStore } from "@/contexts/StoreContext";
import { useEffect } from "react";

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

  // Automatically print receipt when transaction completes and printer is connected
  useEffect(() => {
    let hasTriggered = false; // Prevent multiple prints

    const autoPrint = async () => {
      if (isConnected && transaction && !hasTriggered) {
        hasTriggered = true;
        console.log('Auto-printing receipt to thermal printer...');
        await printReceipt(transaction, customer, currentStore?.name);
      }
    };

    // Small delay to ensure transaction is fully processed
    const timer = setTimeout(autoPrint, 1000);
    return () => clearTimeout(timer);
  }, [isConnected, transaction?.receiptNumber]); // Only depend on essential values

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
