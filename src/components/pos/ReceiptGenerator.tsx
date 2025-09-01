import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { Printer, Download, Bluetooth } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Transaction, Customer } from "@/types";
import { useStore } from "@/contexts/StoreContext";
import { useThermalPrinter } from "@/hooks/useThermalPrinter";
import { BIRComplianceService } from "@/services/bir/birComplianceService";
import { toast } from "sonner";
import { formatCurrency } from "@/utils/format";

interface ReceiptGeneratorProps {
  transaction: Transaction;
  customer?: Customer | null;
}

export default function ReceiptGenerator({ transaction, customer }: ReceiptGeneratorProps) {
  const { currentStore } = useStore();
  const { isAvailable, isConnected, printReceipt, isPrinting } = useThermalPrinter();
  const receiptRef = React.useRef<HTMLDivElement>(null);

  // Add validation and logging
  React.useEffect(() => {
    console.log("ReceiptGenerator: Component mounted with:", {
      transaction: {
        receiptNumber: transaction?.receiptNumber,
        createdAt: transaction?.createdAt,
        itemsCount: transaction?.items?.length,
        total: transaction?.total
      },
      customer: customer?.name,
      currentStore: currentStore?.name
    });

    if (!transaction) {
      console.error("ReceiptGenerator: No transaction provided");
      return;
    }

    if (!transaction.receiptNumber) {
      console.error("ReceiptGenerator: Missing receipt number");
      return;
    }

    if (!transaction.items || transaction.items.length === 0) {
      console.error("ReceiptGenerator: No items in transaction");
      return;
    }
  }, [transaction, customer, currentStore]);

  const handlePrint = () => {
    const content = receiptRef.current;
    if (!content) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Failed to open print window. Please check your popup settings.');
      return;
    }
    
    // Add print-specific styling
    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt ${transaction.receiptNumber}</title>
          <style>
            body {
              font-family: 'Courier New', monospace;
              width: 80mm;
              margin: 0 auto;
              padding: 5mm;
              text-align: center;
            }
            .receipt-header {
              text-align: center;
              margin-bottom: 10px;
            }
            .receipt-title {
              font-size: 16px;
              font-weight: bold;
            }
            .receipt-item {
              display: flex;
              justify-content: space-between;
              margin-bottom: 5px;
            }
            .receipt-total {
              font-weight: bold;
              margin-top: 10px;
              border-top: 1px solid #000;
              padding-top: 5px;
            }
            .receipt-footer {
              text-align: center;
              margin-top: 20px;
              font-size: 12px;
            }
            .divider {
              border-top: 1px dashed #000;
              margin: 10px 0;
            }
          </style>
        </head>
        <body>
          ${content.textContent || ''}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  const handleThermalPrint = async () => {
    if (!isConnected) {
      toast.error('No thermal printer connected');
      return;
    }

    const success = await printReceipt(transaction, customer, currentStore, 'Cashier');
    if (success) {
      toast.success('Receipt printed to thermal printer');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);
  };

  // Generate QR code content with error handling
  const qrContent = React.useMemo(() => {
    try {
      const receiptNum = transaction?.receiptNumber || 'UNKNOWN';
      const storeName = currentStore?.name || 'Unknown Store';
      const date = transaction?.createdAt ? format(new Date(transaction.createdAt), 'yyyy-MM-dd HH:mm') : 'Unknown Date';
      const total = transaction?.total || 0;
      return `RECEIPT:${receiptNum}|STORE:${storeName}|DATE:${date}|TOTAL:${total}`;
    } catch (error) {
      console.error("ReceiptGenerator: Error generating QR content:", error);
      return `RECEIPT:${transaction?.receiptNumber || 'ERROR'}`;
    }
  }, [transaction, currentStore]);

  return (
    <div>
      {/* Receipt content */}
      <div ref={receiptRef} className="text-sm">
        {/* Receipt header */}
        <div className="receipt-header text-center mb-4">
          <h2 className="text-xl font-bold">{currentStore?.business_name || currentStore?.name || 'Store Name'}</h2>
          <p className="text-xs">{currentStore?.address || 'Store Address'}</p>
          {currentStore?.phone && <p className="text-xs">Tel: {currentStore.phone}</p>}
          {currentStore?.tin && <p className="text-xs">TIN: {currentStore.tin}</p>}
          
          <div className="mt-2">
            <h3 className="font-bold">SALES RECEIPT</h3>
            <p>Receipt #: {transaction.receiptNumber}</p>
            <p>Date: {transaction.createdAt ? format(new Date(transaction.createdAt), 'MMM dd, yyyy h:mm a') : 'Unknown Date'}</p>
            {currentStore?.machine_accreditation_number && (
              <p className="text-xs">Machine ACC: {currentStore.machine_accreditation_number}</p>
            )}
            {currentStore?.machine_serial_number && (
              <p className="text-xs">SN: {currentStore.machine_serial_number}</p>
            )}
            <p className="text-xs">Terminal: {transaction.terminal_id || 'TERMINAL-01'}</p>
            
            {customer && (
              <div className="mt-2">
                <p className="font-medium">Customer:</p>
                <p>{customer.name}</p>
                {customer.phone && <p>Phone: {customer.phone}</p>}
              </div>
            )}
          </div>
        </div>
        
        <Separator className="my-2" />
        
        <div>
          <div className="flex justify-between font-medium">
            <span>Item</span>
            <div className="flex">
              <span className="w-16 text-center">Qty</span>
              <span className="w-20 text-right">Price</span>
            </div>
          </div>
          
          <Separator className="my-1" />
          
          {transaction.items?.map((item, index) => (
            <div key={index} className="mb-1">
              <div className="font-medium">{item.name || 'Unknown Item'}</div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{formatCurrency(item.unitPrice || 0)} each</span>
                <div className="flex">
                  <span className="w-16 text-center">{item.quantity || 0}</span>
                  <span className="w-20 text-right">{formatCurrency(item.totalPrice || 0)}</span>
                </div>
              </div>
            </div>
          )) || (
            <div className="text-center text-red-600">
              No items found in transaction
            </div>
          )}
          
          <Separator className="my-2" />
          
          <div className="space-y-1">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>{formatCurrency(transaction.subtotal)}</span>
            </div>
            
            {/* BIR-compliant VAT breakdown */}
            <div className="flex justify-between">
              <span>VATable Sales:</span>
              <span>{formatCurrency((transaction.vat_sales || transaction.subtotal) - (transaction.discount || 0))}</span>
            </div>
            {transaction.vat_exempt_sales && transaction.vat_exempt_sales > 0 && (
              <div className="flex justify-between">
                <span>VAT-Exempt Sales:</span>
                <span>{formatCurrency(transaction.vat_exempt_sales)}</span>
              </div>
            )}
            {transaction.zero_rated_sales && transaction.zero_rated_sales > 0 && (
              <div className="flex justify-between">
                <span>Zero-Rated Sales:</span>
                <span>{formatCurrency(transaction.zero_rated_sales)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>VAT Amount (12%):</span>
              <span>{formatCurrency(transaction.tax)}</span>
            </div>
            
            {/* BIR-compliant discount breakdown */}
            {transaction.discount > 0 && (
              <>
                {transaction.discountType === 'senior' && (
                  <div className="flex justify-between text-green-600">
                    <span>Senior Citizen Discount:</span>
                    <span>-{formatCurrency(transaction.discount)}</span>
                  </div>
                )}
                {transaction.discountType === 'pwd' && (
                  <div className="flex justify-between text-green-600">
                    <span>PWD Discount:</span>
                    <span>-{formatCurrency(transaction.discount)}</span>
                  </div>
                )}
                {transaction.discountType === 'employee' && (
                  <div className="flex justify-between text-green-600">
                    <span>Employee Discount:</span>
                    <span>-{formatCurrency(transaction.discount)}</span>
                  </div>
                )}
                {(!transaction.discountType || !['senior', 'pwd', 'employee'].includes(transaction.discountType)) && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount:</span>
                    <span>-{formatCurrency(transaction.discount)}</span>
                  </div>
                )}
              </>
            )}
            
            <Separator className="my-2" />
            
            <div className="flex justify-between font-bold">
              <span>AMOUNT DUE:</span>
              <span>{formatCurrency(transaction.total)}</span>
            </div>
            
            <div className="mt-2">
              <div className="flex justify-between">
                <span>Payment Method:</span>
                <span className="capitalize">{transaction.paymentMethod}</span>
              </div>
              
              {transaction.paymentMethod === 'cash' && (
                <>
                  <div className="flex justify-between">
                    <span>Amount Tendered:</span>
                    <span>{formatCurrency(transaction.amountTendered || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Change:</span>
                    <span>{formatCurrency(transaction.change || 0)}</span>
                  </div>
                </>
              )}
              
              {transaction.paymentMethod === 'card' && transaction.paymentDetails?.cardType && (
                <div className="flex justify-between">
                  <span>Card:</span>
                  <span>{transaction.paymentDetails.cardType} (xxxx{transaction.paymentDetails.cardNumber})</span>
                </div>
              )}
              
              {transaction.paymentMethod === 'e-wallet' && transaction.paymentDetails?.eWalletProvider && (
                <div className="flex justify-between">
                  <span>E-wallet:</span>
                  <span>{transaction.paymentDetails.eWalletProvider} (#{transaction.paymentDetails.eWalletReferenceNumber})</span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="mt-4 text-center">
          <div className="flex justify-center mb-2">
            {qrContent ? (
              <QRCodeSVG value={qrContent} size={80} />
            ) : (
              <div className="w-20 h-20 bg-gray-200 flex items-center justify-center text-xs">
                QR Error
              </div>
            )}
          </div>
          <p className="text-xs">{transaction.receiptNumber || 'No Receipt Number'}</p>
          {transaction.sequence_number && (
            <p className="text-xs">Seq: {transaction.sequence_number}</p>
          )}
          <div className="mt-2 border-t pt-2">
            <p className="text-xs font-bold">THIS SERVES AS AN OFFICIAL RECEIPT</p>
            <p className="text-xs">Thank you for your purchase!</p>
            {currentStore?.pos_version && (
              <p className="text-xs">POS Ver: {currentStore.pos_version}</p>
            )}
          </div>
        </div>
      </div>

      {/* Print buttons */}
      <div className="mt-4 space-y-2">
        {/* Thermal printer button - show if available */}
        {isAvailable && (
          <Button
            onClick={handleThermalPrint}
            disabled={!isConnected || isPrinting}
            className="w-full flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isPrinting ? (
              <>
                <Bluetooth className="mr-2 h-4 w-4 animate-pulse" />
                Printing to Thermal...
              </>
            ) : isConnected ? (
              <>
                <Bluetooth className="mr-2 h-4 w-4" />
                Print to Thermal Printer
              </>
            ) : (
              <>
                <Bluetooth className="mr-2 h-4 w-4" />
                Connect Thermal Printer First
              </>
            )}
          </Button>
        )}

        {/* Regular print button */}
        <Button
          onClick={handlePrint}
          variant={isAvailable ? "outline" : "default"}
          className="w-full flex items-center justify-center"
        >
          <Printer className="mr-2 h-4 w-4" />
          Print Receipt (Browser)
        </Button>

        {/* Download button */}
        <Button 
          variant="outline" 
          className="w-full flex items-center justify-center"
          onClick={() => toast.info("Download functionality coming soon!")}
        >
          <Download className="mr-2 h-4 w-4" />
          Download Receipt
        </Button>
      </div>
    </div>
  );
}
