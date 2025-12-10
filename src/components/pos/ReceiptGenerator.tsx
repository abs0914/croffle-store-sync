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
import { ReceiptPdfGenerator, ReceiptData } from "@/services/reports/receiptPdfGenerator";

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
    
    // Add print-specific styling with proper HTML preservation
    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt ${transaction.receiptNumber}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Courier New', Courier, monospace;
              width: 80mm;
              max-width: 80mm;
              margin: 0 auto;
              padding: 10px;
              font-size: 12px;
              line-height: 1.4;
              color: #000;
              background: #fff;
            }
            .receipt-header {
              text-align: center;
              margin-bottom: 10px;
            }
            h2 {
              font-size: 14px;
              font-weight: bold;
              margin-bottom: 4px;
            }
            h3 {
              font-size: 13px;
              font-weight: bold;
              margin: 8px 0 4px;
            }
            p {
              font-size: 11px;
              margin: 2px 0;
            }
            hr, [data-slot="separator"] {
              border: none;
              border-top: 1px dashed #000;
              margin: 8px 0;
            }
            .flex {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
            }
            .font-bold, .font-medium {
              font-weight: bold;
            }
            .text-center {
              text-align: center;
            }
            .text-right {
              text-align: right;
            }
            .text-xs {
              font-size: 10px;
            }
            .text-sm {
              font-size: 11px;
            }
            .text-green-600 {
              color: #16a34a;
            }
            .text-red-600 {
              color: #dc2626;
            }
            .text-blue-600 {
              color: #2563eb;
            }
            .text-muted-foreground {
              color: #666;
            }
            .mt-2 { margin-top: 8px; }
            .mt-4 { margin-top: 16px; }
            .mb-1 { margin-bottom: 4px; }
            .mb-2 { margin-bottom: 8px; }
            .mb-4 { margin-bottom: 16px; }
            .ml-2 { margin-left: 8px; }
            .space-y-1 > * + * { margin-top: 4px; }
            .w-16 { width: 50px; display: inline-block; text-align: center; }
            .w-20 { width: 60px; display: inline-block; text-align: right; }
            .pt-2 { padding-top: 8px; }
            .border-t { border-top: 1px solid #000; }
            .capitalize { text-transform: capitalize; }
            svg { display: inline-block; }
            /* Hide non-printable elements */
            button, .no-print { display: none !important; }
            /* QR code styling */
            .qr-container { display: flex; justify-content: center; margin: 8px 0; }
            /* Ensure items display properly */
            .item-row { margin-bottom: 8px; }
            @media print {
              body { width: 80mm; margin: 0; padding: 5mm; }
              @page { size: 80mm auto; margin: 0; }
            }
          </style>
        </head>
        <body>
          ${content.innerHTML || ''}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const handleDownload = () => {
    try {
      // Map transaction data to ReceiptData format
      const receiptData: ReceiptData = {
        receiptNumber: transaction.receiptNumber || 'N/A',
        businessDate: transaction.createdAt ? format(new Date(transaction.createdAt), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
        transactionTime: transaction.createdAt ? format(new Date(transaction.createdAt), 'HH:mm:ss') : format(new Date(), 'HH:mm:ss'),
        storeName: currentStore?.business_name || currentStore?.name || 'Store',
        storeAddress: currentStore?.address || '',
        storeTin: currentStore?.tin || '',
        cashierName: (transaction as any).cashier_name || 'Cashier',
        items: (transaction.items || []).map(item => ({
          description: item.name || 'Unknown Item',
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice || 0,
          lineTotal: item.totalPrice || (item.quantity * item.unitPrice) || 0,
          itemDiscount: 0,
          vatExemptFlag: false,
        })),
        grossAmount: transaction.subtotal || 0,
        discountAmount: transaction.discount || 0,
        netAmount: transaction.total || 0,
        vatAmount: transaction.tax || 0,
        paymentMethod: transaction.paymentMethod || 'Cash',
        seniorDiscount: (transaction as any).senior_discount || 0,
        pwdDiscount: (transaction as any).pwd_discount || 0,
      };

      const generator = new ReceiptPdfGenerator();
      const pdfDataUri = generator.generateReceipt(receiptData);
      
      // Create download link
      const link = document.createElement('a');
      link.href = pdfDataUri;
      link.download = `Receipt-${transaction.receiptNumber || 'unknown'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Receipt downloaded successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to download receipt');
    }
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

  // Format TIN for BIR compliance
  const formatTIN = (tin?: string): string => {
    if (!tin) return 'N/A';
    // Format as xxx-xxx-xxx-xxx
    const cleaned = tin.replace(/\D/g, '');
    if (cleaned.length === 12) {
      return `${cleaned.slice(0,3)}-${cleaned.slice(3,6)}-${cleaned.slice(6,9)}-${cleaned.slice(9)}`;
    }
    return tin;
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
          
          {/* BIR: VAT Registration Status */}
          {currentStore?.is_vat_registered ? (
            <p className="text-xs font-medium">VAT REG. TIN: {formatTIN(currentStore.tin)}</p>
          ) : (
            <p className="text-xs font-medium">NON-VAT REG. TIN: {formatTIN(currentStore.tin)}</p>
          )}
          
          {/* BIR: Taxpayer Name (if different from business name) */}
          {currentStore?.owner_name && currentStore.owner_name !== currentStore.business_name && (
            <p className="text-xs">Taxpayer: {currentStore.owner_name}</p>
          )}
          
          {/* BIR: Permit Number and Validity */}
          {currentStore?.permit_number && (
            <p className="text-xs">Permit No: {currentStore.permit_number}</p>
          )}
          {currentStore?.valid_until && (
            <p className="text-xs">Valid Until: {format(new Date(currentStore.valid_until), 'MM/dd/yyyy')}</p>
          )}
          
          <div className="mt-2">
            <h3 className="font-bold">SALES INVOICE</h3>
            <p>SI #: {transaction.receiptNumber}</p>
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
          
          {/* BIR: POS/CAS Supplier Information */}
          {currentStore?.supplier_name && (
            <div className="text-xs mt-2 p-2 bg-muted rounded border">
              <p className="font-medium">POS Provider:</p>
              <p>{currentStore.supplier_name}</p>
              {currentStore.supplier_address && <p>{currentStore.supplier_address}</p>}
              {currentStore.supplier_tin && <p>TIN: {formatTIN(currentStore.supplier_tin)}</p>}
              {currentStore.accreditation_date && (
                <p>Accredited: {format(new Date(currentStore.accreditation_date), 'MM/dd/yyyy')}</p>
              )}
            </div>
          )}
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
            {/* Multiple Senior Citizens */}
            {transaction.senior_discounts_detail && transaction.senior_discounts_detail.length > 0 && (
              <div className="space-y-1">
                <div className="text-xs font-semibold">Senior Citizen Discounts:</div>
                {transaction.senior_discounts_detail.map((senior, idx) => (
                  <div key={idx} className="flex justify-between text-xs text-green-600">
                    <span className="ml-2">{senior.name} ({senior.idNumber})</span>
                    <span>-{formatCurrency(senior.discountAmount)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* VAT Exemption */}
            {transaction.vat_exemption_amount && transaction.vat_exemption_amount > 0 && (
              <div className="flex justify-between text-xs text-blue-600">
                <span>VAT Exemption:</span>
                <span>-{formatCurrency(transaction.vat_exemption_amount)}</span>
              </div>
            )}

            {/* Other Discounts (PWD, Employee, etc.) */}
            {transaction.other_discount_detail && (
              <div className="flex justify-between text-xs text-green-600">
                <span>
                  {transaction.other_discount_detail.type === 'pwd' && 'PWD Discount'}
                  {transaction.other_discount_detail.type === 'employee' && 'Employee Discount'}
                  {transaction.other_discount_detail.type === 'loyalty' && 'Loyalty Discount'}
                  {transaction.other_discount_detail.type === 'promo' && 'Promo Discount'}
                  {transaction.other_discount_detail.type === 'complimentary' && 'Complimentary'}
                  {transaction.other_discount_detail.idNumber && ` (${transaction.other_discount_detail.idNumber})`}:
                </span>
                <span>-{formatCurrency(transaction.other_discount_detail.amount)}</span>
              </div>
            )}

            {/* Legacy fallback for old transactions without detailed breakdown */}
            {transaction.discount > 0 && !transaction.senior_discounts_detail && !transaction.other_discount_detail && (
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
            {/* BIR: Accreditation Status */}
            {!currentStore?.is_bir_accredited ? (
              <p className="text-xs font-bold text-red-600">THIS IS NOT AN OFFICIAL RECEIPT</p>
            ) : (
              <p className="text-xs font-bold">THIS SERVES AS AN OFFICIAL RECEIPT</p>
            )}
            
            {/* BIR: NON-VAT Disclaimer */}
            {!currentStore?.is_vat_registered && currentStore?.non_vat_disclaimer && (
              <p className="text-xs mt-2 pt-2 border-t">{currentStore.non_vat_disclaimer}</p>
            )}
            
            <p className="text-xs mt-2">Thank you for your purchase!</p>
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
          onClick={handleDownload}
        >
          <Download className="mr-2 h-4 w-4" />
          Download Receipt
        </Button>
      </div>
    </div>
  );
}
