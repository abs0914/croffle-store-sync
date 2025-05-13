
import { useState } from "react";
import PaymentMethods from "./payment/PaymentMethods";

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
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'e-wallet'>('cash');
  const [amountTendered, setAmountTendered] = useState<number>(total);
  
  // Card payment details
  const [cardType, setCardType] = useState<string>('');
  const [cardNumber, setCardNumber] = useState<string>('');
  
  // E-wallet payment details
  const [eWalletProvider, setEWalletProvider] = useState<string>('');
  const [eWalletReferenceNumber, setEWalletReferenceNumber] = useState<string>('');
  
  const handleCompletePayment = () => {
    if (paymentMethod === 'card') {
      onPaymentComplete(
        paymentMethod, 
        total,
        { cardType, cardNumber }
      );
    } else if (paymentMethod === 'e-wallet') {
      onPaymentComplete(
        paymentMethod,
        total,
        { eWalletProvider, eWalletReferenceNumber }
      );
    } else {
      // Cash payment
      onPaymentComplete(paymentMethod, amountTendered);
    }
  };

  return (
    <div className="space-y-4">
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
      
      <button 
        onClick={handleCompletePayment}
        className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded-md"
      >
        Complete Payment
      </button>
    </div>
  );
}
