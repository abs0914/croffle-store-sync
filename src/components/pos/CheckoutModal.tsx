import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CartItem } from "@/types/productVariations";
import { PaymentProcessor } from "./payment/PaymentProcessor";
import ReceiptGenerator from "./ReceiptGenerator";
import { useStore } from "@/contexts/StoreContext";
import { useShift } from "@/contexts/shift";
import { toast } from "sonner";
import { streamlinedTransactionService } from "@/services/transactions/streamlinedTransactionService";
import { transactionHealthMonitor } from "@/services/transactions/transactionHealthMonitor";
import { Transaction } from "@/types";
import { Loader2, AlertTriangle } from "lucide-react";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  total: number;
  discount: number;
  finalTotal: number;
  onTransactionComplete?: (transaction: Transaction) => void;
  customerId?: string;
  discountType?: string;
  discountIdNumber?: string;
  orderType?: string;
  deliveryPlatform?: string;
  deliveryOrderNumber?: string;
}

export function CheckoutModal({
  isOpen,
  onClose,
  cartItems,
  total,
  discount,
  finalTotal,
  onTransactionComplete,
  customerId,
  discountType,
  discountIdNumber,
  orderType = "dine_in",
  deliveryPlatform,
  deliveryOrderNumber
}: CheckoutModalProps) {
  const [showReceipt, setShowReceipt] = useState(false);
  const [completedTransaction, setCompletedTransaction] = useState<Transaction | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { currentStore } = useStore();
  const { currentShift } = useShift();

  // Pre-payment validation state
  const [isValidating, setIsValidating] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const [canProceedWithPayment, setCanProceedWithPayment] = useState(false);
  const [systemHealth, setSystemHealth] = useState<'checking' | 'healthy' | 'degraded' | 'critical'>('checking');

  // Pre-payment validation and health check on modal open
  useEffect(() => {
    if (isOpen && currentStore?.id && cartItems.length > 0) {
      checkSystemHealthAndValidate();
    }
  }, [isOpen, currentStore?.id, cartItems]);

  const checkSystemHealthAndValidate = async () => {
    // First check system health
    setSystemHealth('checking');
    try {
      const healthCheck = await transactionHealthMonitor.canProcessTransactions();
      if (!healthCheck.allowed) {
        setSystemHealth('critical');
        setValidationErrors([`System unavailable: ${healthCheck.reason}`]);
        setCanProceedWithPayment(false);
        return;
      }
      
      const health = await transactionHealthMonitor.getCurrentHealth();
      setSystemHealth(health.systemStatus);
      
      // If system is healthy, proceed with validation
      if (health.systemStatus !== 'critical') {
        await performPrePaymentValidation();
      }
    } catch (error) {
      console.error('Health check failed:', error);
      setSystemHealth('critical');
      setValidationErrors(['System health check failed']);
      setCanProceedWithPayment(false);
    }
  };

  const performPrePaymentValidation = async () => {
    if (!currentStore?.id) return;
    
    setIsValidating(true);
    setValidationErrors([]);
    setValidationWarnings([]);
    setCanProceedWithPayment(false);
    
    try {
      const itemsToValidate = cartItems.map(item => ({
        productId: item.product.id,
        name: item.product.product_name,
        quantity: item.quantity,
        unitPrice: item.finalPrice / item.quantity,
        totalPrice: item.finalPrice,
        variationId: item.selectedVariations?.[0]?.id
      }));

      const validation = await streamlinedTransactionService.validateBeforePayment(
        currentStore.id,
        itemsToValidate
      );
      
      setValidationErrors(validation.errors);
      setValidationWarnings(validation.warnings);
      setCanProceedWithPayment(validation.canProceed);
      
      if (validation.errors.length > 0) {
        console.warn('Pre-payment validation failed:', validation.errors);
      }
      
      if (validation.warnings.length > 0) {
        console.log('Pre-payment validation warnings:', validation.warnings);
      }
    } catch (error) {
      console.error('Error in pre-payment validation:', error);
      setValidationErrors(['Failed to validate products for sale']);
      setCanProceedWithPayment(false);
    } finally {
      setIsValidating(false);
    }
  };

  const handlePaymentComplete = async (
    paymentMethod: 'cash' | 'card' | 'e-wallet',
    amountTendered: number,
    paymentDetails?: any
  ): Promise<boolean> => {
    if (!currentStore || !currentShift) {
      toast.error("No active store or shift found");
      return false;
    }

    // Block payment if validation failed
    if (!canProceedWithPayment) {
      toast.error("Cannot process payment due to validation errors");
      return false;
    }

    setIsProcessing(true);
    
    try {
      const transactionData = {
        storeId: currentStore.id,
        userId: currentShift.cashier_id,
        shiftId: currentShift.id,
        customerId: customerId || undefined,
        items: cartItems.map(item => ({
          productId: item.product.id,
          name: item.product.product_name,
          quantity: item.quantity,
          unitPrice: item.finalPrice / item.quantity,
          totalPrice: item.finalPrice,
          variationId: item.selectedVariations?.[0]?.id
        })),
        subtotal: total,
        tax: 0,
        discount: discount,
        discountType: discountType,
        discountIdNumber: discountIdNumber,
        total: finalTotal,
        amountTendered,
        change: amountTendered - finalTotal,
        paymentMethod,
        paymentDetails,
        orderType: orderType as any,
        deliveryPlatform,
        deliveryOrderNumber
      };

      console.log('Processing streamlined transaction:', transactionData);
      
      const transaction = await streamlinedTransactionService.processTransaction(
        transactionData, 
        cartItems
      );
      
      if (transaction) {
        setCompletedTransaction(transaction);
        setShowReceipt(true);
        onTransactionComplete?.(transaction);
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error("Error processing payment:", error);
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReceiptClose = () => {
    setShowReceipt(false);
    setCompletedTransaction(null);
    onClose();
  };

  const handleRetryValidation = () => {
    performPrePaymentValidation();
  };

  if (showReceipt && completedTransaction) {
    return (
      <Dialog open={showReceipt} onOpenChange={handleReceiptClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Receipt</DialogTitle>
          </DialogHeader>
          <ReceiptGenerator 
            transaction={completedTransaction}
            customer={undefined}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Checkout</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Cart Summary */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-2">Order Summary</h3>
              <div className="space-y-2 text-sm">
                {cartItems.map((item, index) => (
                  <div key={index} className="flex justify-between">
                    <span>{item.quantity}x {item.product.product_name}</span>
                    <span>₱{item.finalPrice.toFixed(2)}</span>
                  </div>
                ))}
                <hr />
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>₱{total.toFixed(2)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount:</span>
                    <span>-₱{discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold">
                  <span>Total:</span>
                  <span>₱{finalTotal.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* System Health Status */}
          {systemHealth === 'checking' && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Checking system health...</span>
                </div>
              </CardContent>
            </Card>
          )}

          {systemHealth === 'critical' && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium text-red-800">System Critical</span>
                </div>
                <p className="text-sm text-red-600 mt-1">
                  Transaction system is experiencing issues. Please contact support.
                </p>
              </CardContent>
            </Card>
          )}

          {systemHealth === 'degraded' && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-800">System Degraded</span>
                </div>
                <p className="text-sm text-yellow-600 mt-1">
                  Transaction system is experiencing reduced performance.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Pre-payment validation display */}
          {isValidating && systemHealth === 'healthy' && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Validating products for sale with real inventory checks...</span>
                </div>
              </CardContent>
            </Card>
          )}
          
          {validationErrors.length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <h4 className="text-sm font-medium text-red-800 mb-2">Cannot Process Payment:</h4>
                <ul className="text-sm text-red-600 space-y-1">
                  {validationErrors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
                <Button 
                  onClick={checkSystemHealthAndValidate}
                  size="sm" 
                  variant="outline" 
                  className="mt-2"
                >
                  Retry System Check
                </Button>
              </CardContent>
            </Card>
          )}
          
          {validationWarnings.length > 0 && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardContent className="p-4">
                <h4 className="text-sm font-medium text-yellow-800 mb-2">Warnings:</h4>
                <ul className="text-sm text-yellow-600 space-y-1">
                  {validationWarnings.map((warning, index) => (
                    <li key={index}>• {warning}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Payment Section - Only show if validation passes and system is healthy */}
          {canProceedWithPayment && !isValidating && systemHealth !== 'critical' && (
            <PaymentProcessor
              total={finalTotal}
              itemCount={cartItems.reduce((sum, item) => sum + item.quantity, 0)}
              onPaymentComplete={handlePaymentComplete}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}