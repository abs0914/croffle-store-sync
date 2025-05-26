
import { Separator } from "@/components/ui/separator";
import PaymentProcessor from "../payment/PaymentProcessor";

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
  // For VAT-inclusive pricing:
  // subtotal = VAT-inclusive total (e.g., ₱65.00)
  // tax = VAT amount embedded in the total (calculated in CartContext)
  // total = same as subtotal for VAT-inclusive pricing

  // Calculate the net amount (price without VAT) from VAT-inclusive total
  const netAmount = subtotal / 1.12;
  // Use the VAT amount calculated in CartContext
  const vatAmount = tax;

  // Calculate final total after discount (VAT-inclusive)
  const finalTotal = subtotal - discount;

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

      {discount > 0 && (
        <div className="flex justify-between text-green-600">
          <span>Discount</span>
          <span>-₱{discount.toFixed(2)}</span>
        </div>
      )}

      <Separator className="bg-croffle-primary/20" />

      <div className="flex justify-between text-lg font-bold">
        <span className="text-croffle-primary">Total Price</span>
        <span className="text-croffle-primary">₱{finalTotal.toFixed(2)}</span>
      </div>

      {/* Payment Processor */}
      <PaymentProcessor
        total={finalTotal}
        onPaymentComplete={handlePaymentComplete}
      />
    </div>
  );
}
