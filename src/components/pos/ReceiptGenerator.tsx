
import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { Printer, Download } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Transaction, Customer } from "@/types";
import { useStore } from "@/contexts/StoreContext";
import { toast } from "sonner";
import { formatCurrency } from "@/utils/format";

interface ReceiptGeneratorProps {
  transaction: Transaction;
  customer?: Customer | null;
}

export default function ReceiptGenerator({ transaction, customer }: ReceiptGeneratorProps) {
  const { currentStore } = useStore();
  const receiptRef = React.useRef<HTMLDivElement>(null);

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
          ${content.innerHTML}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };



  // Generate QR code content
  const qrContent = `RECEIPT:${transaction.receiptNumber}|STORE:${currentStore?.name || ''}|DATE:${format(new Date(transaction.createdAt), 'yyyy-MM-dd HH:mm')}|TOTAL:${transaction.total}`;

  return (
    <div>
      {/* Receipt content */}
      <div ref={receiptRef} className="text-sm">
        <div className="receipt-header text-center mb-4">
          <h2 className="text-xl font-bold">{currentStore?.name || 'Store Name'}</h2>
          <p className="text-xs">{currentStore?.address || 'Store Address'}</p>
          {currentStore?.phone && <p className="text-xs">Tel: {currentStore.phone}</p>}
          
          <div className="mt-2">
            <h3 className="font-bold">SALES RECEIPT</h3>
            <p>Receipt #: {transaction.receiptNumber}</p>
            <p>Date: {format(new Date(transaction.createdAt), 'MMM dd, yyyy h:mm a')}</p>
            
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
          
          {transaction.items.map((item, index) => (
            <div key={index} className="mb-1">
              <div className="font-medium">{item.name}</div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{formatCurrency(item.unitPrice)} each</span>
                <div className="flex">
                  <span className="w-16 text-center">{item.quantity}</span>
                  <span className="w-20 text-right">{formatCurrency(item.totalPrice)}</span>
                </div>
              </div>
            </div>
          ))}
          
          <Separator className="my-2" />
          
          <div className="space-y-1">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>{formatCurrency(transaction.subtotal)}</span>
            </div>
            {transaction.discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount 
                  {transaction.discountType && ` (${transaction.discountType})`}:
                </span>
                <span>-{formatCurrency(transaction.discount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>VAT (12%):</span>
              <span>{formatCurrency(transaction.tax)}</span>
            </div>
            
            <Separator className="my-2" />
            
            <div className="flex justify-between font-bold">
              <span>TOTAL:</span>
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
            <QRCodeSVG value={qrContent} size={80} />
          </div>
          <p className="text-xs">{transaction.receiptNumber}</p>
          <p className="text-xs mt-2">Thank you for your purchase!</p>
        </div>
      </div>

      {/* Print buttons */}
      <div className="mt-4 space-y-2">
        <Button 
          onClick={handlePrint}
          className="w-full flex items-center justify-center"
        >
          <Printer className="mr-2 h-4 w-4" />
          Print Receipt
        </Button>
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
