
import { Separator } from "@/components/ui/separator";
import PaymentProcessor from "../payment/PaymentProcessor";
import { formatCurrency } from "@/utils/format";
import { PrinterStatusIndicator } from "@/components/printer/PrinterStatusIndicator";
import { QuickPrinterSetup } from "@/components/printer/QuickPrinterSetup";
import { Button } from "@/components/ui/button";
import { Bluetooth } from "lucide-react";
import { useCart } from "@/contexts/cart/CartContext";

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
  // Use the cart context to get proper calculations
  const { calculations } = useCart();

  // Use the proper calculations from the cart context
  // This ensures consistency with the main cart display
  const netAmount = calculations.netAmount;
  const vatAmount = calculations.adjustedVAT;
  const finalTotal = calculations.finalTotal;

  return (
    <div className="space-y-2 pt-4">
      <Separator className="bg-croffle-primary/20" />

      <div className="flex justify-between">
        <span className="text-muted-foreground">Net Amount</span>
        <span className="font-medium">{formatCurrency(netAmount)}</span>
      </div>

      <div className="flex justify-between">
        <span className="text-muted-foreground">VAT (12%)</span>
        <span className="font-medium">{formatCurrency(vatAmount)}</span>
      </div>

      {/* Show VAT Exemption if applicable */}
      {calculations.vatExemption > 0 && (
        <div className="flex justify-between text-blue-600">
          <span>VAT Exemption</span>
          <span>-{formatCurrency(calculations.vatExemption)}</span>
        </div>
      )}

      {/* Show total discount amount if applicable */}
      {calculations.totalDiscountAmount > 0 && (
        <div className="flex justify-between text-green-600">
          <span>Total Discount</span>
          <span>-{formatCurrency(calculations.totalDiscountAmount)}</span>
        </div>
      )}

      <Separator className="bg-croffle-primary/20" />

      <div className="flex justify-between text-lg font-bold">
        <span className="text-croffle-primary">Total Price</span>
        <span className="text-croffle-primary">{formatCurrency(finalTotal)}</span>
      </div>

      {/* Printer Status */}
      <div className="flex items-center justify-between py-2">
        <PrinterStatusIndicator />
        <QuickPrinterSetup>
          <Button variant="ghost" size="sm" className="text-xs">
            <Bluetooth className="h-3 w-3 mr-1" />
            Setup
          </Button>
        </QuickPrinterSetup>
      </div>

      {/* Payment Processor */}
      <PaymentProcessor
        total={finalTotal}
        onPaymentComplete={handlePaymentComplete}
      />
    </div>
  );
}
