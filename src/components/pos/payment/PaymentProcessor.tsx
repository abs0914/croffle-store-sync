
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useShift } from "@/contexts/shift";
import PaymentMethods from "./PaymentMethods";
import PaymentProgress from "./PaymentProgress";
import { formatCurrency } from "@/utils/format";
import { Loader2 } from "lucide-react";

interface PaymentProcessorProps {
  total: number;
  itemCount?: number;
  onPaymentComplete: (
    paymentMethod: 'cash' | 'card' | 'e-wallet',
    amountTendered: number,
    paymentDetails?: {
      cardType?: string;
      cardNumber?: string;
      eWalletProvider?: string;
      eWalletReferenceNumber?: string;
      paymentTransactionId?: string;
    }
  ) => Promise<boolean>;
}

export default function PaymentProcessor({ total, itemCount = 1, onPaymentComplete }: PaymentProcessorProps) {
  const { currentShift } = useShift();
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'e-wallet'>('cash');
  const [amountTendered, setAmountTendered] = useState<number>(0);
  
  // Progress tracking for large orders
  const [showProgress, setShowProgress] = useState(false);
  const [progressStage, setProgressStage] = useState<'validation' | 'inventory' | 'payment' | 'complete'>('validation');
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [estimatedTime, setEstimatedTime] = useState<number>();
  
  // Card payment details
  const [cardType, setCardType] = useState<string>('');
  const [cardNumber, setCardNumber] = useState<string>('');
  
  // E-wallet payment details
  const [eWalletProvider, setEWalletProvider] = useState<string>('');
  const [eWalletReferenceNumber, setEWalletReferenceNumber] = useState<string>('');
  
  const handlePayment = async () => {
    // Validate payment
    if (!currentShift) {
      toast.error("No active shift. Please start a shift before processing payments.");
      return;
    }

    if (total < 0) {
      toast.error("Cannot process payment for negative amount.");
      return;
    }

    // Set processing state
    setIsProcessing(true);
    
    // Import batch processing service to check if we need progress indication
    const { BatchProcessingService } = await import('@/services/transactions/batchProcessingService');
    const shouldShowProgress = BatchProcessingService.shouldUseBatchProcessing(itemCount);
    
    if (shouldShowProgress) {
      setShowProgress(true);
      setProgressStage('payment');
      setProgressPercent(0);
      setProgressMessage('Preparing payment...');
      setEstimatedTime(BatchProcessingService.estimateProcessingTime(itemCount));
    }

    try {
      // Import and use payment validation service
      const { PaymentValidationService } = await import('@/services/payment/paymentValidationService');
      
      let paymentDetails;
      
      if (paymentMethod === 'cash') {
        // Validate cash payment
        const validation = PaymentValidationService.validateCashPayment(total, amountTendered);
        if (!validation.isValid) {
          return; // Errors already shown via toast
        }
        
        // Process payment
        const paymentResult = await PaymentValidationService.processPayment('cash', total);
        if (!paymentResult.success) {
          toast.error(`Payment failed: ${paymentResult.error}`);
          return;
        }
        
        // Update progress for large orders
        if (shouldShowProgress) {
          setProgressPercent(50);
          setProgressMessage('Processing transaction...');
        }
        
        // Wait for complete payment flow including navigation
        const success = await onPaymentComplete(paymentMethod, amountTendered, {
          // Store payment transaction ID in a way that matches the expected interface
          cardType: 'PaymentProcessed',
          cardNumber: paymentResult.transactionId || 'PROCESSED'
        });

        if (!success) {
          toast.error("Failed to complete transaction");
          return;
        }
        
      } else if (paymentMethod === 'card') {
        paymentDetails = { 
          cardType: cardType.trim(), 
          cardNumber: cardNumber.slice(-4).trim() 
        };
        
        // Validate card payment
        const validation = PaymentValidationService.validateCardPayment(total, paymentDetails);
        if (!validation.isValid) {
          return; // Errors already shown via toast
        }
        
        // Process payment
        const paymentResult = await PaymentValidationService.processPayment('card', total, paymentDetails);
        if (!paymentResult.success) {
          toast.error(`Payment failed: ${paymentResult.error}`);
          return;
        }
        
        // Wait for complete payment flow including navigation
        const success = await onPaymentComplete(paymentMethod, total, {
          ...paymentDetails,
          // Store payment transaction ID in card number field for simplicity
          cardNumber: paymentResult.transactionId || paymentDetails.cardNumber
        });

        if (!success) {
          toast.error("Failed to complete transaction");
          return;
        }
        
      } else if (paymentMethod === 'e-wallet') {
        paymentDetails = { 
          eWalletProvider: eWalletProvider.trim(), 
          eWalletReferenceNumber: eWalletReferenceNumber.trim() 
        };
        
        // Validate e-wallet payment
        const validation = PaymentValidationService.validateEWalletPayment(total, paymentDetails);
        if (!validation.isValid) {
          return; // Errors already shown via toast
        }
        
        // Process payment
        const paymentResult = await PaymentValidationService.processPayment('e-wallet', total, paymentDetails);
        if (!paymentResult.success) {
          toast.error(`Payment failed: ${paymentResult.error}`);
          return;
        }
        
        // Wait for complete payment flow including navigation
        const success = await onPaymentComplete(paymentMethod, total, {
          ...paymentDetails,
          // Store payment transaction ID in reference number
          eWalletReferenceNumber: paymentResult.transactionId || paymentDetails.eWalletReferenceNumber
        });

        if (!success) {
          toast.error("Failed to complete transaction");
          return;
        }
      }
      
      // Payment completed successfully
      if (shouldShowProgress) {
        setProgressStage('complete');
        setProgressPercent(100);
        setProgressMessage('Transaction completed!');
        // Give user a moment to see completion
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      toast.success("Payment completed - Redirecting to invoice...");
      setIsOpen(false);
      resetFormState();
      
    } catch (error) {
      console.error('Payment processing error:', error);
      toast.error("Payment processing failed. Please try again.");
    } finally {
      setIsProcessing(false);
      setShowProgress(false);
      setProgressPercent(0);
    }
  };

  const resetFormState = () => {
    setAmountTendered(0);
    setCardType('');
    setCardNumber('');
    setEWalletProvider('');
    setEWalletReferenceNumber('');
    setShowProgress(false);
    setProgressPercent(0);
    setProgressMessage('');
  };

  const handleDialogClose = (open: boolean) => {
    if (!isProcessing) {
      setIsOpen(open);
      if (!open) {
        resetFormState();
      }
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleDialogClose}>
        <DialogTrigger asChild>
          <Button
            className="w-full mt-4 bg-green-600 hover:bg-green-700 text-lg py-6"
            disabled={total < 0 || !currentShift || isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              `Pay ${formatCurrency(total)}`
            )}
          </Button>
        </DialogTrigger>
        
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl">
              Payment: {formatCurrency(total)}
              {itemCount > 5 && (
                <div className="text-sm text-gray-600 font-normal mt-1">
                  Large order ({itemCount} items) - Processing may take longer
                </div>
              )}
            </DialogTitle>
          </DialogHeader>
          
          <PaymentMethods
            total={total}
            paymentMethod={paymentMethod}
            setPaymentMethod={setPaymentMethod}
            amountTendered={amountTendered}
            setAmountTendered={setAmountTendered}
            cardType={cardType}
            setCardType={setCardType}
            cardNumber={cardNumber}
            setCardNumber={setCardNumber}
            eWalletProvider={eWalletProvider}
            setEWalletProvider={setEWalletProvider}
            eWalletReferenceNumber={eWalletReferenceNumber}
            setEWalletReferenceNumber={setEWalletReferenceNumber}
            disabled={isProcessing}
          />
          
          <DialogFooter>
            <Button 
              onClick={() => handleDialogClose(false)} 
              variant="outline" 
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button 
              onClick={handlePayment} 
              disabled={isProcessing || total < 0}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Complete Payment'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <PaymentProgress
        isVisible={showProgress}
        stage={progressStage}
        progress={progressPercent}
        message={progressMessage}
        estimatedTime={estimatedTime}
      />
    </>
  );
}
