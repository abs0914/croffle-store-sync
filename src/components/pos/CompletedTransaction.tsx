import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import ReceiptGenerator from "./ReceiptGenerator";
import { Transaction, Customer } from "@/types";
import { useThermalPrinter } from "@/hooks/useThermalPrinter";
import { useStore } from "@/contexts/StoreContext";
import React, { useEffect, useState, useRef, useMemo } from "react";
import { CheckCircle, Printer } from "lucide-react";
import { toast } from "sonner";
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
  const {
    isConnected,
    printReceipt
  } = useThermalPrinter();
  const {
    currentStore
  } = useStore();
  const [countdown, setCountdown] = useState(3);
  const [showBriefSuccess, setShowBriefSuccess] = useState(false);
  
  // Track printed receipts to prevent duplicates
  const printedReceipts = useRef(new Set<string>());
  
  // Stabilize object references to prevent unnecessary useEffect triggers
  const stableCustomer = useMemo(() => customer, [customer?.id, customer?.name]);
  const stableStore = useMemo(() => currentStore, [currentStore?.id, currentStore?.name]);

  // Add defensive checks for transaction data
  React.useEffect(() => {
    console.log("CompletedTransaction: Component mounted with:", {
      transaction: {
        receiptNumber: transaction?.receiptNumber,
        total: transaction?.total,
        itemsCount: transaction?.items?.length,
        createdAt: transaction?.createdAt,
        paymentMethod: transaction?.paymentMethod
      },
      customer: customer?.name,
      currentStore: currentStore?.name
    });

    // Validate critical transaction fields
    if (!transaction) {
      console.error("CompletedTransaction: No transaction provided");
      toast.error("Error: No transaction data");
      startNewSale();
      return;
    }
    if (!transaction.receiptNumber) {
      console.error("CompletedTransaction: Missing receipt number");
      toast.error("Error: Invalid receipt data");
      startNewSale();
      return;
    }
  }, [transaction, customer, currentStore, startNewSale]);

  // Automatically print receipt when transaction completes and printer is connected
  useEffect(() => {
    // Skip printing process entirely if no printer is connected
    if (!isConnected || !transaction?.receiptNumber) {
      return;
    }
    
    // Check if we've already printed this receipt
    if (printedReceipts.current.has(transaction.receiptNumber)) {
      console.log(`Receipt ${transaction.receiptNumber} already printed, skipping...`);
      return;
    }

    const autoPrint = async () => {
      // Double-check we haven't printed this receipt
      if (!printedReceipts.current.has(transaction.receiptNumber)) {
        printedReceipts.current.add(transaction.receiptNumber);
        
        try {
          console.log('Auto-printing receipt to thermal printer...');
          await printReceipt(transaction, stableCustomer, stableStore, 'Cashier');

          // Show brief success message and start countdown for auto-navigation
          setShowBriefSuccess(true);
        } catch (error) {
          console.error('Auto-print failed:', error);
          // Remove from printed set on failure so it can be retried
          printedReceipts.current.delete(transaction.receiptNumber);
        }
      }
    };

    // Small delay to ensure transaction is fully processed
    const timer = setTimeout(autoPrint, 1000);
    return () => clearTimeout(timer);
  }, [isConnected, transaction?.receiptNumber]); // Removed unstable dependencies

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
    return <div className="flex flex-col items-center justify-center h-full max-w-md mx-auto">
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
          
          <Button onClick={startNewSale} variant="outline" className="mt-4">
            Continue Now
          </Button>
        </div>
      </div>;
  }
  return <div className="h-full overflow-y-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 min-h-full max-w-6xl mx-auto p-3 lg:p-4">
        {/* Receipt Section */}
        <div className="space-y-3 lg:space-y-4 order-2 lg:order-1">
          <div className="text-center">
            <h1 className="text-xl lg:text-2xl font-bold mb-2 text-green-600">Sale Complete!</h1>
            <p className="text-sm lg:text-base text-gray-600 mb-3 lg:mb-4">Transaction #{transaction.receiptNumber}</p>
          </div>
          
          <Card>
            <CardContent className="p-3 lg:p-4">
              {transaction && transaction.receiptNumber ? <ReceiptGenerator transaction={transaction} customer={customer} /> : <div className="text-center py-4">
                  <p className="text-red-600">Error: Invalid transaction data</p>
                  <Button onClick={startNewSale} className="mt-2">
                    Start New Sale
                  </Button>
                </div>}
            </CardContent>
          </Card>
        </div>
        
        {/* Actions Section - Top on mobile, right on desktop */}
        
      </div>
    </div>;
}