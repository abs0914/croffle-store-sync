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
import { ReceiptPdfGenerator, ReceiptData, ReceiptBeneficiary } from "@/services/reports/receiptPdfGenerator";

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

  const handleDownload = async () => {
    try {
      // Build discount beneficiaries from transaction data
      const discountBeneficiaries: ReceiptBeneficiary[] = [];
      const txData = transaction as any;
      
      // Check new unified format first
      if (txData.discount_beneficiaries && Array.isArray(txData.discount_beneficiaries)) {
        txData.discount_beneficiaries.forEach((b: any) => {
          discountBeneficiaries.push({
            type: b.type,
            idNumber: b.idNumber || b.id_number || '',
            name: b.name || '',
            discountAmount: b.discountAmount || b.discount_amount || 0,
            vatExemptionAmount: b.vatExemptionAmount || b.vat_exemption_amount || 0,
            isVATExempt: ['senior', 'pwd', 'naac', 'athletes_coaches', 'solo_parent'].includes(b.type)
          });
        });
      }
      
      // Fallback to legacy senior_discounts_detail or seniorDiscounts
      const seniorDiscounts = txData.senior_discounts_detail || txData.seniorDiscounts;
      if (discountBeneficiaries.length === 0 && seniorDiscounts && Array.isArray(seniorDiscounts)) {
        seniorDiscounts.forEach((s: any) => {
          discountBeneficiaries.push({
            type: 'senior',
            idNumber: s.idNumber || s.id_number || '',
            name: s.name || '',
            discountAmount: s.discountAmount || s.discount_amount || 0,
            vatExemptionAmount: 0,
            isVATExempt: true
          });
        });
      }
      
      // Fallback to legacy other_discount_detail or otherDiscount
      const otherDiscount = txData.other_discount_detail || txData.otherDiscount;
      if (otherDiscount && typeof otherDiscount === 'object') {
        if (['pwd', 'naac', 'athletes_coaches', 'solo_parent'].includes(otherDiscount.type)) {
          discountBeneficiaries.push({
            type: otherDiscount.type,
            idNumber: otherDiscount.idNumber || otherDiscount.id_number || '',
            name: otherDiscount.name || '',
            discountAmount: otherDiscount.discountAmount || otherDiscount.discount_amount || 0,
            vatExemptionAmount: 0,
            isVATExempt: true
          });
        }
      }

      // Map transaction data to ReceiptData format
      const receiptData: ReceiptData = {
        receiptNumber: transaction.receiptNumber || 'N/A',
        businessDate: transaction.createdAt ? format(new Date(transaction.createdAt), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
        transactionTime: transaction.createdAt ? format(new Date(transaction.createdAt), 'HH:mm:ss') : format(new Date(), 'HH:mm:ss'),
        storeName: currentStore?.business_name 
          ? `${currentStore.business_name}${currentStore.name ? ` - ${currentStore.name}` : ''}`
          : (currentStore?.name || 'Store'),
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
        grossAmount: transaction.subtotal || 
          (transaction.items?.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)) || 
          ((transaction.total || 0) + (transaction.discount || 0)) || 0,
        discountAmount: transaction.discount || 0,
        netAmount: transaction.total || 0,
        vatAmount: transaction.tax || 0,
        paymentMethod: transaction.paymentMethod || 'Cash',
        discountType: txData.discount_type || txData.discountType || '',
        seniorDiscount: txData.senior_discount || 0,
        pwdDiscount: txData.pwd_discount || 0,
        amountTendered: transaction.amountTendered,
        change: transaction.change,
        discountBeneficiaries: discountBeneficiaries.length > 0 ? discountBeneficiaries : undefined
      };

      const generator = new ReceiptPdfGenerator();
      const pdfDataUri = await generator.generateReceipt(receiptData);
      
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

  // Generate human-readable QR code content
  const qrContent = React.useMemo(() => {
    try {
      const storeName = currentStore?.business_name || currentStore?.name || 'Store';
      const storeAddress = currentStore?.address || '';
      const tin = currentStore?.tin || 'N/A';
      const siNumber = transaction?.receiptNumber || 'N/A';
      const dateStr = transaction?.createdAt 
        ? format(new Date(transaction.createdAt), 'MMM dd, yyyy h:mm a') 
        : 'N/A';
      
      // Build items list (compact format)
      const itemsText = (transaction?.items || [])
        .map(item => `${item.name} x${item.quantity} = P${(item.totalPrice || 0).toFixed(2)}`)
        .join('\n');
      
      const subtotal = transaction?.subtotal || 0;
      const vat = transaction?.tax || 0;
      const discount = transaction?.discount || 0;
      const total = transaction?.total || 0;
      const paymentMethod = transaction?.paymentMethod || 'Cash';
      const amountTendered = transaction?.amountTendered || total;
      const change = transaction?.change || 0;

      // Build readable receipt text
      return `========================
    SALES INVOICE
========================
${storeName}
${storeAddress}
TIN: ${tin}

SI #: ${siNumber}
Date: ${dateStr}
------------------------
ITEMS:
${itemsText}
------------------------
Subtotal:    P${subtotal.toFixed(2)}
VAT (12%):   P${vat.toFixed(2)}${discount > 0 ? `\nDiscount:   -P${discount.toFixed(2)}` : ''}
------------------------
TOTAL:       P${total.toFixed(2)}

Payment: ${paymentMethod}${paymentMethod.toLowerCase() === 'cash' ? `\nTendered:    P${amountTendered.toFixed(2)}\nChange:      P${change.toFixed(2)}` : ''}
========================
Thank you!`;
    } catch (error) {
      console.error("ReceiptGenerator: Error generating QR content:", error);
      return `SI #: ${transaction?.receiptNumber || 'ERROR'}`;
    }
  }, [transaction, currentStore]);

  return (
    <div>
      {/* Receipt content - receipt-content class is used for @media print */}
      <div ref={receiptRef} className="text-sm receipt-content">
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
            
            {/* BIR-compliant VAT breakdown - correctly handle VAT-exempt transactions */}
            {(() => {
              const txData = transaction as any;
              const discountType = txData.discountType || txData.discount_type || '';
              const discountBeneficiaries = txData.discount_beneficiaries || [];
              
              // Check if this is a VAT-exempt transaction
              const vatExemptTypes = ['senior', 'pwd', 'athletes_coaches', 'solo_parent'];
              const isVatExemptDiscount = vatExemptTypes.includes(discountType);
              const hasVatExemptBeneficiary = Array.isArray(discountBeneficiaries) && 
                discountBeneficiaries.some((b: any) => vatExemptTypes.includes(b.type));
              const isVatExemptTransaction = (isVatExemptDiscount || hasVatExemptBeneficiary) && 
                (transaction.discount > 0 || discountBeneficiaries.length > 0);
              
              // Calculate proper VAT breakdown
              const grossAmount = transaction.subtotal || 0;
              const discountAmount = transaction.discount || 0;
              const netAmount = grossAmount - discountAmount;
              const vatAmount = isVatExemptTransaction ? 0 : (transaction.tax || (netAmount / 1.12 * 0.12));
              const netOfVat = netAmount - vatAmount;
              
              // For VAT-exempt transactions: entire net becomes VAT-exempt, VATable = 0
              const vatableSales = isVatExemptTransaction ? 0 : netOfVat;
              const vatExemptSales = isVatExemptTransaction ? netOfVat : (transaction.vat_exempt_sales || 0);
              const zeroRatedSales = transaction.zero_rated_sales || 0;
              
              return (
                <>
                  <div className="flex justify-between">
                    <span>VATable Sales:</span>
                    <span>{formatCurrency(vatableSales)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>VAT-Exempt Sales:</span>
                    <span>{formatCurrency(vatExemptSales)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Zero-Rated Sales:</span>
                    <span>{formatCurrency(zeroRatedSales)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>VAT Amount (12%):</span>
                    <span>{formatCurrency(vatAmount)}</span>
                  </div>
                </>
              );
            })()}
            
            {/* BIR-compliant discount breakdown - NEW Multi-Beneficiary Support */}
            {(transaction as any).discount_beneficiaries && (transaction as any).discount_beneficiaries.length > 0 ? (
              <div className="space-y-2">
                {/* Group beneficiaries by type */}
                {(() => {
                  const beneficiaries = (transaction as any).discount_beneficiaries;
                  const grouped = beneficiaries.reduce((acc: Record<string, any[]>, b: any) => {
                    if (!acc[b.type]) acc[b.type] = [];
                    acc[b.type].push(b);
                    return acc;
                  }, {});
                  
                  const typeLabels: Record<string, string> = {
                    senior: 'Senior Citizen',
                    pwd: 'PWD',
                    athletes_coaches: 'NAAC',
                    solo_parent: 'Solo Parent',
                    employee: 'Employee',
                    loyalty: 'Loyalty',
                    custom: 'Custom',
                    complimentary: 'Complimentary'
                  };
                  
                  return Object.entries(grouped).map(([type, items]: [string, any[]]) => (
                    <div key={type} className="space-y-1">
                      <div className="text-xs font-semibold">
                        {typeLabels[type] || type} Discount{items.length > 1 ? 's' : ''}:
                      </div>
                      {items.map((b: any, idx: number) => (
                        <div key={idx} className="flex justify-between text-xs text-green-600">
                          <span className="ml-2">
                            {b.name || 'Beneficiary'} {b.idNumber && `(${b.idNumber})`}
                          </span>
                          <span>-{formatCurrency(b.discountAmount)}</span>
                        </div>
                      ))}
                    </div>
                  ));
                })()}
                
                {/* Total VAT Exemption */}
                {(() => {
                  const totalVatExempt = (transaction as any).discount_beneficiaries
                    .filter((b: any) => b.isVATExempt)
                    .reduce((sum: number, b: any) => sum + (b.vatExemptionAmount || 0), 0);
                  return totalVatExempt > 0 ? (
                    <div className="flex justify-between text-xs text-blue-600">
                      <span>VAT Exemption:</span>
                      <span>-{formatCurrency(totalVatExempt)}</span>
                    </div>
                  ) : null;
                })()}
              </div>
            ) : (
              <>
                {/* Legacy: Multiple Senior Citizens */}
                {(transaction as any).senior_discounts_detail && (transaction as any).senior_discounts_detail.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-xs font-semibold">Senior Citizen Discounts:</div>
                    {(transaction as any).senior_discounts_detail.map((senior: any, idx: number) => (
                      <div key={idx} className="flex justify-between text-xs text-green-600">
                        <span className="ml-2">{senior.name} ({senior.idNumber})</span>
                        <span>-{formatCurrency(senior.discountAmount)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Legacy: VAT Exemption */}
                {(transaction as any).vat_exemption_amount && (transaction as any).vat_exemption_amount > 0 && (
                  <div className="flex justify-between text-xs text-blue-600">
                    <span>VAT Exemption:</span>
                    <span>-{formatCurrency((transaction as any).vat_exemption_amount)}</span>
                  </div>
                )}

                {/* Legacy: Other Discounts (PWD, Employee, etc.) */}
                {(transaction as any).other_discount_detail && (
                  <div className="flex justify-between text-xs text-green-600">
                    <span>
                      {(transaction as any).other_discount_detail.type === 'pwd' && 'PWD Discount'}
                      {(transaction as any).other_discount_detail.type === 'employee' && 'Employee Discount'}
                      {(transaction as any).other_discount_detail.type === 'loyalty' && 'Loyalty Discount'}
                      {(transaction as any).other_discount_detail.type === 'promo' && 'Promo Discount'}
                      {(transaction as any).other_discount_detail.type === 'complimentary' && 'Complimentary'}
                      {(transaction as any).other_discount_detail.type === 'athletes_coaches' && 'NAAC Discount'}
                      {(transaction as any).other_discount_detail.type === 'solo_parent' && 'Solo Parent Discount'}
                      {(transaction as any).other_discount_detail.idNumber && ` (${(transaction as any).other_discount_detail.idNumber})`}:
                    </span>
                    <span>-{formatCurrency((transaction as any).other_discount_detail.amount)}</span>
                  </div>
                )}

                {/* Legacy fallback for old transactions without detailed breakdown */}
                {transaction.discount > 0 && !(transaction as any).senior_discounts_detail && !(transaction as any).other_discount_detail && (
                  <>
                    {(transaction as any).discountType === 'senior' && (
                      <div className="flex justify-between text-green-600">
                        <span>Senior Citizen Discount:</span>
                        <span>-{formatCurrency(transaction.discount)}</span>
                      </div>
                    )}
                    {(transaction as any).discountType === 'pwd' && (
                      <div className="flex justify-between text-green-600">
                        <span>PWD Discount:</span>
                        <span>-{formatCurrency(transaction.discount)}</span>
                      </div>
                    )}
                    {(transaction as any).discountType === 'athletes_coaches' && (
                      <div className="flex justify-between text-green-600">
                        <span>NAAC Discount:</span>
                        <span>-{formatCurrency(transaction.discount)}</span>
                      </div>
                    )}
                    {(transaction as any).discountType === 'solo_parent' && (
                      <div className="flex justify-between text-green-600">
                        <span>Solo Parent Discount:</span>
                        <span>-{formatCurrency(transaction.discount)}</span>
                      </div>
                    )}
                    {(transaction as any).discountType === 'employee' && (
                      <div className="flex justify-between text-green-600">
                        <span>Employee Discount:</span>
                        <span>-{formatCurrency(transaction.discount)}</span>
                      </div>
                    )}
                    {(!(transaction as any).discountType || !['senior', 'pwd', 'employee', 'athletes_coaches', 'solo_parent'].includes((transaction as any).discountType)) && transaction.discount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Discount:</span>
                        <span>-{formatCurrency(transaction.discount)}</span>
                      </div>
                    )}
                  </>
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
            {/* BIR compliant invoice statement */}
            <p className="text-xs font-bold">THIS SERVES AS YOUR INVOICE</p>
            
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
