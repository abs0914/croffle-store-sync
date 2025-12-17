import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { format } from 'date-fns';

interface VoidReceiptData {
  voidReceiptNumber: string;
  originalReceiptNumber: string;
  originalTransactionDate: string;
  originalTotal: number;
  originalVatAmount: number;
  originalDiscountAmount: number;
  originalItems: any[];
  voidReasonCategory: string;
  voidReason: string;
  voidNotes?: string;
  voidedByCashierName: string;
  authorizedByName?: string;
  voidDate: string;
  terminalId: string;
}

interface StoreInfo {
  name: string;
  address: string;
  tin: string;
}

/**
 * Generate browser print HTML for void receipt
 */
export const generateVoidReceiptHtml = (
  voidData: VoidReceiptData,
  storeInfo: StoreInfo
): string => {
  const itemsHtml = (voidData.originalItems || [])
    .map(
      (item: any) => `
      <tr>
        <td style="text-align: left;">${item.name || item.product_name}</td>
        <td style="text-align: center;">${item.quantity}</td>
        <td style="text-align: right;">P${(item.price || item.unit_price || 0).toFixed(2)}</td>
        <td style="text-align: right;">P${((item.price || item.unit_price || 0) * item.quantity).toFixed(2)}</td>
      </tr>
    `
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: 'Courier New', monospace;
          font-size: 12px;
          width: 80mm;
          margin: 0 auto;
          padding: 10px;
        }
        .header {
          text-align: center;
          margin-bottom: 10px;
        }
        .title {
          font-size: 14px;
          font-weight: bold;
          margin: 10px 0;
          text-align: center;
          background: #000;
          color: white;
          padding: 5px;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          margin: 2px 0;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 10px 0;
        }
        th, td {
          padding: 3px;
          font-size: 11px;
        }
        th {
          border-bottom: 1px dashed #000;
          text-align: left;
        }
        .separator {
          border-top: 1px dashed #000;
          margin: 10px 0;
        }
        .total-row {
          font-weight: bold;
          font-size: 14px;
        }
        .footer {
          text-align: center;
          margin-top: 15px;
          font-size: 10px;
        }
        .void-badge {
          background: #000;
          color: white;
          padding: 5px 10px;
          display: inline-block;
          font-weight: bold;
          margin: 5px 0;
        }
        .warning-box {
          border: 2px solid #dc2626;
          padding: 8px;
          margin: 10px 0;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <strong>${storeInfo.name}</strong><br>
        ${storeInfo.address}<br>
        TIN: ${storeInfo.tin}
      </div>
      
      <div class="title">
        <span class="void-badge">*** VOID TRANSACTION ***</span>
      </div>
      
      <div class="info-row">
        <span>Void Doc #:</span>
        <span>${voidData.voidReceiptNumber}</span>
      </div>
      <div class="info-row">
        <span>Original SI #:</span>
        <span><strong>${voidData.originalReceiptNumber}</strong></span>
      </div>
      <div class="info-row">
        <span>Original Date:</span>
        <span>${format(new Date(voidData.originalTransactionDate), 'MM/dd/yyyy hh:mm a')}</span>
      </div>
      <div class="info-row">
        <span>Void Date:</span>
        <span>${format(new Date(voidData.voidDate), 'MM/dd/yyyy hh:mm a')}</span>
      </div>
      <div class="info-row">
        <span>Voided By:</span>
        <span>${voidData.voidedByCashierName}</span>
      </div>
      ${voidData.authorizedByName ? `
      <div class="info-row">
        <span>Authorized By:</span>
        <span>${voidData.authorizedByName}</span>
      </div>
      ` : ''}
      <div class="info-row">
        <span>Terminal:</span>
        <span>${voidData.terminalId}</span>
      </div>
      
      <div class="separator"></div>
      
      <div class="warning-box">
        <strong>VOIDED ITEMS</strong>
      </div>
      
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th style="text-align: center;">Qty</th>
            <th style="text-align: right;">Price</th>
            <th style="text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>
      
      <div class="separator"></div>
      
      <div class="info-row">
        <span>Subtotal:</span>
        <span>P${(voidData.originalTotal + voidData.originalDiscountAmount).toFixed(2)}</span>
      </div>
      ${voidData.originalDiscountAmount > 0 ? `
      <div class="info-row">
        <span>Discount:</span>
        <span>-P${voidData.originalDiscountAmount.toFixed(2)}</span>
      </div>
      ` : ''}
      <div class="info-row">
        <span>VAT (12%):</span>
        <span>P${voidData.originalVatAmount.toFixed(2)}</span>
      </div>
      
      <div class="separator"></div>
      
      <div class="info-row total-row">
        <span>VOIDED AMOUNT:</span>
        <span>P${voidData.originalTotal.toFixed(2)}</span>
      </div>
      
      <div class="separator"></div>
      
      <div style="margin: 10px 0;">
        <strong>Reason Category:</strong> ${voidData.voidReasonCategory.replace(/_/g, ' ').toUpperCase()}<br>
        <strong>Reason:</strong> ${voidData.voidReason}
      </div>
      
      ${voidData.voidNotes ? `<div><strong>Notes:</strong> ${voidData.voidNotes}</div>` : ''}
      
      <div class="footer">
        <p>================================</p>
        <p><strong>THIS IS A VOID DOCUMENT</strong></p>
        <p>This transaction has been cancelled</p>
        <p>Original SI #: ${voidData.originalReceiptNumber}</p>
        <p>================================</p>
        <p>PVOSyncPOS v1.0.0</p>
      </div>
    </body>
    </html>
  `;
};

/**
 * Print void receipt using browser print
 */
export const printVoidReceipt = (
  voidData: VoidReceiptData,
  storeInfo: StoreInfo
) => {
  const html = generateVoidReceiptHtml(voidData, storeInfo);
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  }
};

/**
 * Generate PDF void receipt
 */
export const generateVoidReceiptPdf = async (
  voidData: VoidReceiptData,
  storeInfo: StoreInfo
): Promise<jsPDF> => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [80, 220],
  });

  let y = 10;
  const lineHeight = 4;
  const leftMargin = 5;
  const pageWidth = 80;
  const contentWidth = pageWidth - leftMargin * 2;

  // Helper function for centered text
  const centerText = (text: string, yPos: number, fontSize = 8) => {
    doc.setFontSize(fontSize);
    const textWidth = doc.getStringUnitWidth(text) * fontSize / doc.internal.scaleFactor;
    doc.text(text, (pageWidth - textWidth) / 2, yPos);
  };

  // Helper for left-right text
  const leftRightText = (left: string, right: string, yPos: number) => {
    doc.setFontSize(8);
    doc.text(left, leftMargin, yPos);
    const rightWidth = doc.getStringUnitWidth(right) * 8 / doc.internal.scaleFactor;
    doc.text(right, pageWidth - leftMargin - rightWidth, yPos);
  };

  // Store Header
  doc.setFont('helvetica', 'bold');
  centerText(storeInfo.name, y, 10);
  y += lineHeight + 1;

  doc.setFont('helvetica', 'normal');
  centerText(storeInfo.address, y, 7);
  y += lineHeight;
  centerText(`TIN: ${storeInfo.tin}`, y, 7);
  y += lineHeight + 2;

  // Void Title
  doc.setFillColor(0, 0, 0);
  doc.rect(leftMargin, y, contentWidth, 6, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  centerText('*** VOID TRANSACTION ***', y + 4, 9);
  doc.setTextColor(0, 0, 0);
  y += 10;

  // Receipt Info
  doc.setFont('helvetica', 'normal');
  leftRightText('Void Doc #:', voidData.voidReceiptNumber, y);
  y += lineHeight;
  
  doc.setFont('helvetica', 'bold');
  leftRightText('Original SI #:', voidData.originalReceiptNumber, y);
  doc.setFont('helvetica', 'normal');
  y += lineHeight;
  
  leftRightText('Original Date:', format(new Date(voidData.originalTransactionDate), 'MM/dd/yy hh:mm a'), y);
  y += lineHeight;
  leftRightText('Void Date:', format(new Date(voidData.voidDate), 'MM/dd/yy hh:mm a'), y);
  y += lineHeight;
  leftRightText('Voided By:', voidData.voidedByCashierName, y);
  y += lineHeight;
  
  if (voidData.authorizedByName) {
    leftRightText('Authorized By:', voidData.authorizedByName, y);
    y += lineHeight;
  }
  
  leftRightText('Terminal:', voidData.terminalId, y);
  y += lineHeight + 2;

  // Separator
  doc.setLineWidth(0.1);
  doc.setLineDashPattern([1, 1], 0);
  doc.line(leftMargin, y, pageWidth - leftMargin, y);
  y += 3;

  // Voided Items Header
  doc.setFont('helvetica', 'bold');
  centerText('VOIDED ITEMS', y, 8);
  y += lineHeight + 1;

  doc.setFontSize(7);
  doc.text('Item', leftMargin, y);
  doc.text('Qty', 40, y);
  doc.text('Price', 50, y);
  doc.text('Total', 65, y);
  y += lineHeight;

  doc.setLineDashPattern([1, 1], 0);
  doc.line(leftMargin, y - 1, pageWidth - leftMargin, y - 1);

  // Items
  doc.setFont('helvetica', 'normal');
  (voidData.originalItems || []).forEach((item: any) => {
    const name = (item.name || item.product_name || 'Unknown').substring(0, 18);
    const price = item.price || item.unit_price || 0;
    const total = price * item.quantity;
    
    doc.text(name, leftMargin, y);
    doc.text(item.quantity.toString(), 42, y);
    doc.text(`P${price.toFixed(0)}`, 50, y);
    doc.text(`P${total.toFixed(2)}`, 63, y);
    y += lineHeight;
  });

  y += 2;
  doc.line(leftMargin, y, pageWidth - leftMargin, y);
  y += 3;

  // Totals
  leftRightText('Subtotal:', `P${(voidData.originalTotal + voidData.originalDiscountAmount).toFixed(2)}`, y);
  y += lineHeight;
  
  if (voidData.originalDiscountAmount > 0) {
    leftRightText('Discount:', `-P${voidData.originalDiscountAmount.toFixed(2)}`, y);
    y += lineHeight;
  }
  
  leftRightText('VAT (12%):', `P${voidData.originalVatAmount.toFixed(2)}`, y);
  y += lineHeight + 2;

  doc.line(leftMargin, y, pageWidth - leftMargin, y);
  y += 3;

  // Void Amount
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  leftRightText('VOIDED AMOUNT:', `P${voidData.originalTotal.toFixed(2)}`, y);
  y += lineHeight + 2;

  doc.line(leftMargin, y, pageWidth - leftMargin, y);
  y += 3;

  // Reason
  doc.setFontSize(8);
  doc.text('Reason Category:', leftMargin, y);
  y += lineHeight;
  doc.setFont('helvetica', 'normal');
  doc.text(voidData.voidReasonCategory.replace(/_/g, ' ').toUpperCase(), leftMargin, y);
  y += lineHeight + 1;

  doc.setFont('helvetica', 'bold');
  doc.text('Reason:', leftMargin, y);
  y += lineHeight;
  doc.setFont('helvetica', 'normal');
  const reasonText = doc.splitTextToSize(voidData.voidReason, contentWidth);
  doc.text(reasonText, leftMargin, y);
  y += reasonText.length * lineHeight + 2;

  // QR Code
  try {
    const qrData = `VOID: ${voidData.voidReceiptNumber}\nOriginal SI: ${voidData.originalReceiptNumber}\nAmount: P${voidData.originalTotal.toFixed(2)}\nDate: ${voidData.voidDate}`;
    const qrDataUrl = await QRCode.toDataURL(qrData, { width: 100, margin: 1 });
    doc.addImage(qrDataUrl, 'PNG', (pageWidth - 25) / 2, y, 25, 25);
    y += 28;
  } catch (e) {
    console.error('QR generation failed:', e);
  }

  // Footer
  doc.setFontSize(7);
  centerText('================================', y);
  y += lineHeight;
  doc.setFont('helvetica', 'bold');
  centerText('THIS IS A VOID DOCUMENT', y);
  y += lineHeight;
  doc.setFont('helvetica', 'normal');
  centerText('This transaction has been cancelled', y);
  y += lineHeight;
  centerText(`Original SI #: ${voidData.originalReceiptNumber}`, y);
  y += lineHeight;
  centerText('================================', y);
  y += lineHeight;
  centerText('PVOSyncPOS v1.0.0', y);

  return doc;
};

/**
 * Download void receipt as PDF
 */
export const downloadVoidReceiptPdf = async (
  voidData: VoidReceiptData,
  storeInfo: StoreInfo
) => {
  const doc = await generateVoidReceiptPdf(voidData, storeInfo);
  doc.save(`void-${voidData.voidReceiptNumber}.pdf`);
};

export type { VoidReceiptData, StoreInfo };
