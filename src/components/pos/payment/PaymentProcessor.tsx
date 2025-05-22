
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useShift } from "@/contexts/shift";
import PaymentMethods from "./PaymentMethods";
import { formatCurrency } from "@/utils/format";

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
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'e-wallet'>('cash');
  const [amountTendered, setAmountTendered] = useState<number>(0);
  
  // Card payment details
  const [cardType, setCardType] = useState<string>('');
  const [cardNumber, setCardNumber] = useState<string>('');
  
  // E-wallet payment details
  const [eWalletProvider, setEWalletProvider] = useState<string>('');
  const [eWalletReferenceNumber, setEWalletReferenceNumber] = useState<string>('');
  
  const handlePayment = () => {
    // Validate payment
    if (!currentShift) {
      toast.error("No active shift. Please start a shift before processing payments.");
      return;
    }
    
    if (paymentMethod === 'cash') {
      if (amountTendered < total) {
        toast.error("Cash amount must be equal to or greater than the total.");
        return;
      }
      
      onPaymentComplete(paymentMethod, amountTendered);
      
    } else if (paymentMethod === 'card') {
      if (!cardType) {
        toast.error("Please select a card type.");
        return;
      }
      if (!cardNumber || cardNumber.length < 4) {
        toast.error("Please enter at least the last 4 digits of the card.");
        return;
      }
      
      onPaymentComplete(
        paymentMethod, 
        total, 
        { cardType, cardNumber: cardNumber.slice(-4) }
      );
      
    } else if (paymentMethod === 'e-wallet') {
      if (!eWalletProvider) {
        toast.error("Please select an e-wallet provider.");
        return;
      }
      if (!eWalletReferenceNumber) {
        toast.error("Please enter the reference number.");
        return;
      }
      
      onPaymentComplete(
        paymentMethod,
        total,
        { eWalletProvider, eWalletReferenceNumber }
      );
    }
    
    // Close dialog
    setIsOpen(false);
    
    // Reset state
    setAmountTendered(0);
    setCardType('');
    setCardNumber('');
    setEWalletProvider('');
    setEWalletReferenceNumber('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          className="w-full mt-4 bg-green-600 hover:bg-green-700 text-lg py-6"
          disabled={total <= 0 || !currentShift}
        >
          Pay ₱{total.toFixed(2)}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl">Payment: ₱{total.toFixed(2)}</DialogTitle>
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
        />
        
        <DialogFooter>
          <Button onClick={() => setIsOpen(false)} variant="outline">
            Cancel
          </Button>
          <Button onClick={handlePayment}>
            Complete Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
