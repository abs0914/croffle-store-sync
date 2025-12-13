import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useShift } from "@/contexts/shift";
import PaymentMethods from "./PaymentMethods";
import { formatCurrency } from "@/utils/format";
import { Loader2, Keyboard } from "lucide-react";
import { usePOSKeyboardShortcuts, useNumericShortcuts } from "@/hooks/useKeyboardShortcuts";
import { PerformanceMonitor } from "@/services/performance/performanceMonitor";

interface EnhancedPaymentProcessorProps {
  total: number;
  itemCount?: number;
  onPaymentComplete: (
    paymentMethod: 'cash' | 'card' | 'e-wallet' | 'gift-certificate',
    amountTendered: number,
    paymentDetails?: {
      cardType?: string;
      cardNumber?: string;
      eWalletProvider?: string;
      eWalletReferenceNumber?: string;
      giftCertificateNumber?: string;
      giftCertificateValue?: number;
    }
  ) => Promise<boolean>;
}

export default function EnhancedPaymentProcessor({ 
  total, 
  itemCount = 1, 
  onPaymentComplete 
}: EnhancedPaymentProcessorProps) {
  const { currentShift } = useShift();
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'e-wallet' | 'gift-certificate'>('cash');
  const [amountTendered, setAmountTendered] = useState<number>(total === 0 ? 0 : total);
  
  // Card payment details
  const [cardType, setCardType] = useState<string>('Visa');
  const [cardNumber, setCardNumber] = useState<string>('');
  
  // E-wallet payment details
  const [eWalletProvider, setEWalletProvider] = useState<string>('GCash');
  const [eWalletReferenceNumber, setEWalletReferenceNumber] = useState<string>('');

  // Gift certificate payment details
  const [giftCertificateNumber, setGiftCertificateNumber] = useState<string>('');
  const [giftCertificateValue, setGiftCertificateValue] = useState<number>(0);

  // Keyboard shortcuts setup
  const handleShowHelp = () => {
    console.group('⌨️ Payment Shortcuts');
    console.log('F10: Cash Payment');
    console.log('F11: Card Payment'); 
    console.log('F12: E-wallet Payment');
    console.log('Ctrl+Enter: Complete Payment');
    console.log('Q/W/E/R: Quick amounts (₱100/₱200/₱500/₱1000)');
    console.groupEnd();
    toast.info('Keyboard shortcuts logged to console');
  };

  const { showShortcutsHelp } = usePOSKeyboardShortcuts({
    onPaymentMethodChange: (method) => {
      setPaymentMethod(method);
      if (method !== 'cash' && amountTendered === 0) {
        setAmountTendered(total);
      }
    },
    onQuickAmount: (amount) => {
      if (paymentMethod === 'cash') {
        setAmountTendered(amount);
      }
    },
    onCompleteTransaction: () => {
      if (isOpen && !isProcessing) {
        handlePayment();
      }
    },
    onShowHelp: handleShowHelp,
    onFocusSearch: () => {
      // Focus search functionality would be handled by parent component
    }
  });

  // Numeric shortcuts for quick amounts
  useNumericShortcuts((amount) => {
    if (paymentMethod === 'cash' && isOpen) {
      setAmountTendered(amount);
    }
  });

  // Auto-set amount for non-cash payments
  useEffect(() => {
    if (paymentMethod !== 'cash') {
      setAmountTendered(total);
    } else if (total === 0) {
      // For complimentary, always set to 0
      setAmountTendered(0);
    }
  }, [paymentMethod, total]);

  const handlePayment = async () => {
    if (!currentShift) {
      toast.error("No active shift found");
      return;
    }

    // Start performance monitoring
    const operationId = `payment_${Date.now()}`;
    PerformanceMonitor.startTimer(operationId);

    // Validation
    if (paymentMethod === 'cash') {
      // For complimentary transactions (zero total), amount must be exactly zero
      if (total === 0) {
        if (amountTendered !== 0) {
          toast.error("Complimentary transaction: amount tendered must be ₱0.00");
          return;
        }
      } else {
        // Normal transaction validation
        if (amountTendered < total) {
          toast.error("Insufficient amount tendered");
          return;
        }
      }
    }

    if (paymentMethod === 'card' && !cardNumber) {
      toast.error("Please enter card number");
      return;
    }

    if (paymentMethod === 'e-wallet' && (!eWalletProvider || !eWalletReferenceNumber)) {
      toast.error("Please complete e-wallet payment details");
      return;
    }

    setIsProcessing(true);

    try {
      // Prepare payment details
      const paymentDetails = {
        ...(paymentMethod === 'card' && {
          cardType,
          cardNumber: `****${cardNumber.slice(-4)}`
        }),
        ...(paymentMethod === 'e-wallet' && {
          eWalletProvider,
          eWalletReferenceNumber
        })
      };

      // Process payment
      const success = await onPaymentComplete(paymentMethod, amountTendered, paymentDetails);
      
      const processingTime = PerformanceMonitor.endTimer(
        operationId, 
        'payment_processing',
        { 
          paymentMethod, 
          total, 
          itemCount,
          success 
        }
      );

      if (success) {
        toast.success(`Payment processed successfully (${processingTime.toFixed(0)}ms)`);
        setIsOpen(false);
        
        // Reset form
        setAmountTendered(0);
        setCardNumber('');
        setEWalletReferenceNumber('');
      } else {
        toast.error("Payment processing failed");
      }
    } catch (error) {
      console.error("Payment error:", error);
      toast.error("Payment processing failed");
      PerformanceMonitor.endTimer(operationId, 'payment_processing_failed', { error });
    } finally {
      setIsProcessing(false);
    }
  };

  const isPaymentValid = () => {
    switch (paymentMethod) {
      case 'cash':
        // For complimentary transactions, amount must be exactly 0
        if (total === 0) {
          return amountTendered === 0;
        }
        return amountTendered >= total;
      case 'card':
        return cardNumber.length >= 4;
      case 'e-wallet':
        return eWalletReferenceNumber.length > 0;
      default:
        return false;
    }
  };

  const changeAmount = paymentMethod === 'cash' ? Math.max(0, amountTendered - total) : 0;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          size="lg" 
          className="w-full font-semibold"
          disabled={total < 0}
          onClick={() => {
            setIsOpen(true);
            setAmountTendered(paymentMethod === 'cash' ? Math.ceil(total / 50) * 50 : total);
          }}
        >
          Complete Payment {formatCurrency(total)}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Process Payment</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShowHelp}
              className="p-1 h-auto"
            >
              <Keyboard className="h-4 w-4" />
            </Button>
          </DialogTitle>
          <div className="text-sm text-muted-foreground">
            <p>Total: <span className="font-semibold">{formatCurrency(total)}</span></p>
            {itemCount > 1 && <p>Items: {itemCount}</p>}
            {total === 0 && (
              <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-700">
                ✅ Complimentary Transaction - No payment required
              </div>
            )}
            {changeAmount > 0 && (
              <p className="text-green-600 font-semibold">
                Change: {formatCurrency(changeAmount)}
              </p>
            )}
          </div>
        </DialogHeader>
        
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
            giftCertificateNumber={giftCertificateNumber}
            setGiftCertificateNumber={setGiftCertificateNumber}
            giftCertificateValue={giftCertificateValue}
            setGiftCertificateValue={setGiftCertificateValue}
            disabled={isProcessing}
          />
          
          {/* Keyboard hints */}
          <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
            <div className="grid grid-cols-2 gap-1">
              <span>F10: Cash</span>
              <span>F11: Card</span>
              <span>F12: E-wallet</span>
              <span>Ctrl+Enter: Pay</span>
              <span>Q: ₱100</span>
              <span>W: ₱200</span>
              <span>E: ₱500</span>
              <span>R: ₱1000</span>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => setIsOpen(false)}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button 
            onClick={handlePayment}
            disabled={!isPaymentValid() || isProcessing}
            className="min-w-[120px]"
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}