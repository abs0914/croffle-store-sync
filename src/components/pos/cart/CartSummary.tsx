
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
  return (
    <div className="space-y-2 pt-4">
      <Separator className="bg-croffle-primary/20" />
      
      <div className="flex justify-between">
        <span className="text-muted-foreground">Subtotal (VAT inclusive)</span>
        <span className="font-medium">₱{subtotal.toFixed(2)}</span>
      </div>
      
      {discount > 0 && (
        <div className="flex justify-between text-green-600">
          <span>Discount</span>
          <span>-₱{discount.toFixed(2)}</span>
        </div>
      )}
      
      <div className="flex justify-between">
        <span className="text-muted-foreground">VAT (12% included)</span>
        <span className="font-medium">₱{tax.toFixed(2)}</span>
      </div>
      
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
