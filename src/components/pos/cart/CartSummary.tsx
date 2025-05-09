
import { Separator } from "@/components/ui/separator";
import PaymentProcessor from "../PaymentProcessor";

interface CartSummaryProps {
  subtotal: number;
  tax: number;
  total: number;
  discount: number;
  discountType?: 'senior' | 'pwd' | 'employee' | 'loyalty' | 'promo';
  handlePaymentComplete: (
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

export default function CartSummary({
  subtotal,
  tax,
  total,
  discount,
  discountType,
  handlePaymentComplete
}: CartSummaryProps) {
  // Calculate the net amount (before VAT)
  const netAmount = subtotal / 1.12;
  // Calculate the VAT amount (12% of net amount)
  const vatAmount = subtotal - netAmount;
  
  return (
    <div className="space-y-2 pt-4">
      <Separator className="bg-croffle-primary/20" />
      
      <div className="flex justify-between">
        <span className="text-muted-foreground">Net Amount</span>
        <span className="font-medium">₱{netAmount.toFixed(2)}</span>
      </div>
      
      <div className="flex justify-between">
        <span className="text-muted-foreground">VAT (12%)</span>
        <span className="font-medium">₱{vatAmount.toFixed(2)}</span>
      </div>
      
      <div className="flex justify-between font-medium">
        <span>Subtotal (VAT inclusive)</span>
        <span>₱{subtotal.toFixed(2)}</span>
      </div>
      
      {discount > 0 && (
        <div className="flex justify-between text-green-600">
          <span>Discount</span>
          <span>-₱{discount.toFixed(2)}</span>
        </div>
      )}
      
      <Separator className="bg-croffle-primary/20" />
      
      <div className="flex justify-between text-lg font-bold">
        <span className="text-croffle-primary">Total</span>
        <span className="text-croffle-primary">₱{(total - discount).toFixed(2)}</span>
      </div>
      
      {/* Payment Processor */}
      <PaymentProcessor
        total={total - discount}
        onPaymentComplete={handlePaymentComplete}
      />
    </div>
  );
}
