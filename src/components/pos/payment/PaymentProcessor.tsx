import React, { useState } from 'react';
import { formatCurrency } from '@/utils/format';
import PaymentMethods from './PaymentMethods';

interface PaymentProcessorProps {
  total: number;
  itemCount: number;
  onPaymentComplete: (
    paymentMethod: 'cash' | 'card' | 'e-wallet',
    amountTendered: number,
    paymentDetails?: any
  ) => Promise<boolean>;
}

export const PaymentProcessor: React.FC<PaymentProcessorProps> = ({
  total,
  itemCount,
  onPaymentComplete
}) => {
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'e-wallet'>('cash');
  const [cashAmountTendered, setCashAmountTendered] = useState<number>(0);
  const [cardType, setCardType] = useState<string>('');
  const [cardNumber, setCardNumber] = useState<string>('');
  const [eWalletProvider, setEWalletProvider] = useState<string>('');
  const [eWalletReference, setEWalletReference] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePayment = async () => {
    setIsProcessing(true);
    try {
      const paymentDetails: any = {};
      
      if (paymentMethod === 'cash') {
        paymentDetails.amountTendered = cashAmountTendered;
        paymentDetails.change = cashAmountTendered - total;
      } else if (paymentMethod === 'card') {
        paymentDetails.cardType = cardType;
        paymentDetails.cardNumber = cardNumber;
      } else if (paymentMethod === 'e-wallet') {
        paymentDetails.provider = eWalletProvider;
        paymentDetails.reference = eWalletReference;
      }

      const success = await onPaymentComplete(
        paymentMethod,
        paymentMethod === 'cash' ? cashAmountTendered : total,
        paymentDetails
      );

      if (success) {
        // Reset form
        setCashAmountTendered(0);
        setCardType('');
        setCardNumber('');
        setEWalletProvider('');
        setEWalletReference('');
      }
    } catch (error) {
      console.error('Payment processing error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const canProceed = () => {
    if (paymentMethod === 'cash') {
      // Special handling for complimentary (zero total)
      if (total === 0) {
        return cashAmountTendered === 0;
      }
      return cashAmountTendered >= total;
    } else if (paymentMethod === 'card') {
      return cardType && cardNumber;
    } else if (paymentMethod === 'e-wallet') {
      return eWalletProvider && eWalletReference;
    }
    return false;
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Payment</h2>
        <div className="flex justify-between text-lg">
          <span>Total ({itemCount} items):</span>
          <span className="font-bold">{formatCurrency(total)}</span>
        </div>
        {total === 0 && (
          <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-700">
            ✅ Complimentary Transaction - No payment required
          </div>
        )}
      </div>

      <PaymentMethods
        total={total}
        paymentMethod={paymentMethod}
        setPaymentMethod={setPaymentMethod}
        amountTendered={cashAmountTendered}
        setAmountTendered={setCashAmountTendered}
        cardType={cardType}
        setCardType={setCardType}
        cardNumber={cardNumber}
        setCardNumber={setCardNumber}
        eWalletProvider={eWalletProvider}
        setEWalletProvider={setEWalletProvider}
        eWalletReferenceNumber={eWalletReference}
        setEWalletReferenceNumber={setEWalletReference}
      />

      <div className="mt-6 flex gap-3">
        <button
          onClick={handlePayment}
          disabled={!canProceed() || isProcessing}
          className="flex-1 bg-primary text-primary-foreground py-3 px-4 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90"
        >
          {isProcessing ? 'Processing...' : `Complete Payment - ${formatCurrency(total)}`}
        </button>
      </div>
    </div>
  );
};

export default PaymentProcessor;