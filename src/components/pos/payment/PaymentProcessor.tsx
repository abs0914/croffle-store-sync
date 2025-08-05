
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useShift } from "@/contexts/shift";
import PaymentMethods from "./PaymentMethods";
import { formatCurrency } from "@/utils/format";
import { Loader2 } from "lucide-react";

interface PaymentProcessorProps {
  total: number;
  onPaymentComplete: (
    paymentMethod: 'cash' | 'card' | 'e-wallet',
    amountTendered: number,
    paymentDetails?: {
      cardType?: string;
      cardNumber?: string;
      eWalletProvider?: string;
      eWalletReferenceNumber?: string;
    }
  ) => void;
}

export default function PaymentProcessor({ total, onPaymentComplete }: PaymentProcessorProps) {
  const { currentShift } = useShift();
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'e-wallet'>('cash');
  const [amountTendered, setAmountTendered] = useState<number>(0);
  
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

    if (total <= 0) {
      toast.error("Cannot process payment for empty cart.");
      return;
    }

    // Set processing state
    setIsProcessing(true);

    try {
      let paymentDetails;
      
      if (paymentMethod === 'cash') {
        if (amountTendered < total) {
          toast.error("Cash amount must be equal to or greater than the total.");
          return;
        }
        
        await onPaymentComplete(paymentMethod, amountTendered);
        
      } else if (paymentMethod === 'card') {
        if (!cardType.trim()) {
          toast.error("Please select a card type.");
          return;
        }
        if (!cardNumber.trim() || cardNumber.length < 4) {
          toast.error("Please enter at least the last 4 digits of the card.");
          return;
        }
        
        paymentDetails = { 
          cardType: cardType.trim(), 
          cardNumber: cardNumber.slice(-4).trim() 
        };
        
        console.log('Processing card payment with details:', paymentDetails);
        await onPaymentComplete(paymentMethod, total, paymentDetails);
        
      } else if (paymentMethod === 'e-wallet') {
        if (!eWalletProvider.trim()) {
          toast.error("Please select an e-wallet provider.");
          return;
        }
        if (!eWalletReferenceNumber.trim()) {
          toast.error("Please enter the reference number.");
          return;
        }
        
        paymentDetails = { 
          eWalletProvider: eWalletProvider.trim(), 
          eWalletReferenceNumber: eWalletReferenceNumber.trim() 
        };
        
        console.log('Processing e-wallet payment with details:', paymentDetails);
        await onPaymentComplete(paymentMethod, total, paymentDetails);
      }
      
      // Close dialog and reset state only on success
      setIsOpen(false);
      resetFormState();
      
    } catch (error) {
      console.error('Payment processing error:', error);
      toast.error("Payment processing failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const resetFormState = () => {
    setAmountTendered(0);
    setCardType('');
    setCardNumber('');
    setEWalletProvider('');
    setEWalletReferenceNumber('');
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
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogTrigger asChild>
        <Button
          className="w-full mt-4 bg-green-600 hover:bg-green-700 text-lg py-6"
          disabled={total <= 0 || !currentShift || isProcessing}
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
          <DialogTitle className="text-xl">Payment: {formatCurrency(total)}</DialogTitle>
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
            disabled={isProcessing || total <= 0}
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
  );
}
