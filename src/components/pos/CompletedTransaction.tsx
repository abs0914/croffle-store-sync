import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import ReceiptGenerator from "./ReceiptGenerator";
import { Transaction, Customer } from "@/types";
import { useThermalPrinter } from "@/hooks/useThermalPrinter";
import { useStore } from "@/contexts/StoreContext";
import { useCart } from "@/contexts/cart/CartContext";
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
  const { clearCart } = useCart();
  const [countdown, setCountdown] = useState(3);
  const [showBriefSuccess, setShowBriefSuccess] = useState(false);
  const [printStatus, setPrintStatus] = useState<'idle' | 'printing' | 'success' | 'failed'>('idle');
  const [printAttempts, setPrintAttempts] = useState(0);
  const [showPrintError, setShowPrintError] = useState(false);
  
  // Track printed receipts to prevent duplicates
  const printedReceipts = useRef(new Set<string>());
  const maxPrintRetries = 5;
  
  // Stabilize object references to prevent unnecessary useEffect triggers
  const stableCustomer = useMemo(() => customer, [customer?.id, customer?.name]);
  const stableStore = useMemo(() => currentStore, [currentStore?.id, currentStore?.name]);

  // Auto-print function
  const autoPrint = async (attempt = 1) => {
    // Double-check we haven't printed this receipt
    if (!printedReceipts.current.has(transaction.receiptNumber)) {
      if (attempt === 1) {
        printedReceipts.current.add(transaction.receiptNumber);
      }
      
      try {
        setPrintStatus('printing');
        setPrintAttempts(attempt);
        
        console.log(`🖨️ [AUTO-PRINT] Starting print attempt ${attempt}/${maxPrintRetries}...`, {
          isOnline: navigator.onLine,
          receiptNumber: transaction.receiptNumber,
          hasStore: !!stableStore,
          storeName: stableStore?.name,
          hasCustomer: !!stableCustomer,
          isPrinterConnected: isConnected
        });
        
        // Wait for connection to stabilize before printing
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Verify printer is still connected before attempting print
        if (!isConnected) {
          console.warn('⚠️ [AUTO-PRINT] Printer disconnected before print could start');
          throw new Error('Printer disconnected');
        }
        
        console.log(`🖨️ [AUTO-PRINT] Attempt ${attempt}: Calling printReceipt...`);
        
        // Show progress notification
        toast.info(`Printing receipt (attempt ${attempt}/${maxPrintRetries})...`, {
          id: 'print-progress',
          duration: 3000
        });
        
        const success = await printReceipt(transaction, stableCustomer, stableStore, 'Cashier');

        if (!success) {
          throw new Error('Print operation returned false');
        }

        // ✅ Print successful
        setPrintStatus('success');
        console.log('✅ [AUTO-PRINT] Receipt printed successfully, clearing cart...');
        clearCart();
        
        toast.dismiss('print-progress');
        toast.success('Receipt printed successfully!');

        // Show brief success message and start countdown for auto-navigation
        setShowBriefSuccess(true);
      } catch (error) {
        console.error(`❌ [AUTO-PRINT] Print attempt ${attempt}/${maxPrintRetries} failed:`, error);
        
        // Retry logic with exponential backoff
        if (attempt < maxPrintRetries) {
          const retryDelay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Max 5s delay
          console.log(`⏰ [AUTO-PRINT] Retrying in ${retryDelay}ms...`);
          
          toast.warning(`Print failed. Retrying in ${retryDelay/1000}s... (${attempt}/${maxPrintRetries})`, {
            id: 'print-progress',
            duration: retryDelay
          });
          
          setTimeout(() => autoPrint(attempt + 1), retryDelay);
        } else {
          // Max retries reached - show error modal
          setPrintStatus('failed');
          printedReceipts.current.delete(transaction.receiptNumber);
          setShowPrintError(true);
          
          toast.dismiss('print-progress');
          toast.error(`Print failed after ${maxPrintRetries} attempts. Please check printer connection.`, {
            duration: 10000
          });
        }
      }
    }
  };

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

    // Longer delay to ensure transaction is fully processed and connection is stable
    const timer = setTimeout(() => autoPrint(1), 1500);
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

  // Handle manual retry
  const handleManualRetry = async () => {
    setShowPrintError(false);
    setPrintAttempts(0);
    printedReceipts.current.delete(transaction.receiptNumber);
    autoPrint(1);
  };

  // Handle skip printing
  const handleSkipPrinting = () => {
    setShowPrintError(false);
    setPrintStatus('success');
    clearCart();
    setShowBriefSuccess(true);
    toast.info('Printing skipped. Transaction completed.');
  };

  // Show printing error modal
  if (showPrintError) {
    return (
      <div className="flex flex-col items-center justify-center h-full max-w-md mx-auto p-6">
        <Card className="w-full border-destructive">
          <CardContent className="p-6 text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
              <Printer className="h-8 w-8 text-destructive" />
            </div>
            
            <div>
              <h1 className="text-2xl font-bold text-destructive mb-2">Printing Failed</h1>
              <p className="text-muted-foreground mb-2">
                Transaction #{transaction.receiptNumber}
              </p>
              <p className="text-sm text-muted-foreground">
                Failed to print receipt after {maxPrintRetries} attempts.
              </p>
            </div>

            <div className="space-y-2 pt-4">
              <Button 
                onClick={handleManualRetry} 
                className="w-full"
                size="lg"
              >
                <Printer className="mr-2 h-4 w-4" />
                Retry Printing
              </Button>
              
              <Button 
                onClick={handleSkipPrinting} 
                variant="outline" 
                className="w-full"
                size="lg"
              >
                Skip & Continue
              </Button>
            </div>

            <p className="text-xs text-muted-foreground pt-4">
              Please check printer connection and power before retrying.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show printing progress
  if (isConnected && printStatus === 'printing') {
    return (
      <div className="flex flex-col items-center justify-center h-full max-w-md mx-auto">
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center animate-pulse">
            <Printer className="h-8 w-8 text-blue-600" />
          </div>
          
          <div>
            <h1 className="text-2xl font-bold text-blue-600 mb-2">Printing Receipt...</h1>
            <p className="text-gray-600 mb-2">Transaction #{transaction.receiptNumber}</p>
            <p className="text-sm text-muted-foreground">
              Attempt {printAttempts} of {maxPrintRetries}
            </p>
          </div>
          
          <div className="text-sm text-muted-foreground">
            Please wait while we print your receipt
          </div>
        </div>
      </div>
    );
  }

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
              <span>Receipt printed successfully</span>
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