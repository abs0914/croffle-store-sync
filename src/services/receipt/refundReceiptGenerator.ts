import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { RefundData, RefundedItem } from '@/types/refund';

interface StoreInfo {
  name: string;
  address: string;
  tin: string;
}

/**
 * Generate browser print HTML for refund receipt
 */
export const generateRefundReceiptHtml = (
  refund: RefundData & { refundReceiptNumber: string },
  storeInfo: StoreInfo
): string => {
  const itemsHtml = refund.refundedItems
    .map(
      (item) => `
      <tr>
        <td style="text-align: left;">${item.productName}</td>
        <td style="text-align: center;">${item.quantity}</td>
        <td style="text-align: right;">P${item.unitPrice.toFixed(2)}</td>
        <td style="text-align: right;">P${item.totalRefund.toFixed(2)}</td>
      </tr>
    `
    )
    .join('');

  const vatAmount = refund.refundAmount * 0.12 / 1.12;
  const netAmount = refund.refundAmount - vatAmount;

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
          background: #f0f0f0;
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
        .refund-badge {
          background: #dc2626;
          color: white;
          padding: 5px 10px;
          display: inline-block;
          font-weight: bold;
          margin: 5px 0;
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
        <span class="refund-badge">REFUND RECEIPT</span>
      </div>
      
      <div class="info-row">
        <span>Refund #:</span>
        <span>${refund.refundReceiptNumber}</span>
      </div>
      <div class="info-row">
        <span>Original Receipt:</span>
        <span>${refund.originalReceiptNumber}</span>
      </div>
      <div class="info-row">
        <span>Date:</span>
        <span>${new Date().toLocaleString()}</span>
      </div>
      <div class="info-row">
        <span>Cashier:</span>
        <span>${refund.processedByName}</span>
      </div>
      <div class="info-row">
        <span>Refund Type:</span>
        <span>${refund.refundType.toUpperCase()}</span>
      </div>
      
      <div class="separator"></div>
      
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
        <span>VAT (12%):</span>
        <span>P${vatAmount.toFixed(2)}</span>
      </div>
      <div class="info-row">
        <span>Net Amount:</span>
        <span>P${netAmount.toFixed(2)}</span>
      </div>
      
      <div class="separator"></div>
      
      <div class="info-row total-row">
        <span>REFUND AMOUNT:</span>
        <span>P${refund.refundAmount.toFixed(2)}</span>
      </div>
      
      <div class="info-row">
        <span>Refund Method:</span>
        <span>${refund.refundMethod.toUpperCase()}</span>
      </div>
      
      <div class="separator"></div>
      
      <div style="margin: 10px 0;">
        <strong>Reason:</strong> ${refund.refundReasonCategory.replace(/_/g, ' ')}<br>
        ${refund.refundReason}
      </div>
      
      ${refund.refundNotes ? `<div><strong>Notes:</strong> ${refund.refundNotes}</div>` : ''}
      
      <div class="footer">
        <p>Original Transaction Total: P${refund.originalTransactionTotal.toFixed(2)}</p>
        <p>----------------------------</p>
        <p>THIS IS A REFUND DOCUMENT</p>
        <p>Thank you for your understanding</p>
      </div>
    </body>
    </html>
  `;
};

/**
 * Print refund receipt using browser print
 */
export const printRefundReceipt = (
  refund: RefundData & { refundReceiptNumber: string },
  storeInfo: StoreInfo
) => {
  const html = generateRefundReceiptHtml(refund, storeInfo);
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
 * Generate PDF refund receipt
 */
export const generateRefundReceiptPdf = async (
  refund: RefundData & { refundReceiptNumber: string },
  storeInfo: StoreInfo
): Promise<jsPDF> => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [80, 200],
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

  // Refund Title
  doc.setFillColor(220, 38, 38);
  doc.rect(leftMargin, y, contentWidth, 6, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  centerText('REFUND RECEIPT', y + 4, 10);
  doc.setTextColor(0, 0, 0);
  y += 10;

  // Receipt Info
  doc.setFont('helvetica', 'normal');
  leftRightText('Refund #:', refund.refundReceiptNumber, y);
  y += lineHeight;
  leftRightText('Original #:', refund.originalReceiptNumber, y);
  y += lineHeight;
  leftRightText('Date:', new Date().toLocaleString(), y);
  y += lineHeight;
  leftRightText('Cashier:', refund.processedByName, y);
  y += lineHeight;
  leftRightText('Type:', refund.refundType.toUpperCase(), y);
  y += lineHeight + 2;

  // Separator
  doc.setLineWidth(0.1);
  doc.setLineDashPattern([1, 1], 0);
  doc.line(leftMargin, y, pageWidth - leftMargin, y);
  y += 3;

  // Items Header
  doc.setFont('helvetica', 'bold');
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
  refund.refundedItems.forEach((item) => {
    const name = item.productName.substring(0, 18);
    doc.text(name, leftMargin, y);
    doc.text(item.quantity.toString(), 42, y);
    doc.text(`P${item.unitPrice.toFixed(0)}`, 50, y);
    doc.text(`P${item.totalRefund.toFixed(2)}`, 63, y);
    y += lineHeight;
  });

  y += 2;
  doc.line(leftMargin, y, pageWidth - leftMargin, y);
  y += 3;

  // Totals
  const vatAmount = refund.refundAmount * 0.12 / 1.12;
  const netAmount = refund.refundAmount - vatAmount;

  leftRightText('VAT (12%):', `P${vatAmount.toFixed(2)}`, y);
  y += lineHeight;
  leftRightText('Net Amount:', `P${netAmount.toFixed(2)}`, y);
  y += lineHeight + 2;

  doc.line(leftMargin, y, pageWidth - leftMargin, y);
  y += 3;

  // Refund Amount
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  leftRightText('REFUND AMOUNT:', `P${refund.refundAmount.toFixed(2)}`, y);
  y += lineHeight + 1;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  leftRightText('Method:', refund.refundMethod.toUpperCase(), y);
  y += lineHeight + 2;

  doc.line(leftMargin, y, pageWidth - leftMargin, y);
  y += 3;

  // Reason
  doc.setFont('helvetica', 'bold');
  doc.text('Reason:', leftMargin, y);
  y += lineHeight;
  doc.setFont('helvetica', 'normal');
  const reasonText = doc.splitTextToSize(
    `${refund.refundReasonCategory.replace(/_/g, ' ')}: ${refund.refundReason}`,
    contentWidth
  );
  doc.text(reasonText, leftMargin, y);
  y += reasonText.length * lineHeight + 2;

  // QR Code
  try {
    const qrData = `Refund: ${refund.refundReceiptNumber}\nOriginal: ${refund.originalReceiptNumber}\nAmount: P${refund.refundAmount.toFixed(2)}`;
    const qrDataUrl = await QRCode.toDataURL(qrData, { width: 100, margin: 1 });
    doc.addImage(qrDataUrl, 'PNG', (pageWidth - 25) / 2, y, 25, 25);
    y += 28;
  } catch (e) {
    console.error('QR generation failed:', e);
  }

  // Footer
  doc.setFontSize(7);
  centerText('THIS IS A REFUND DOCUMENT', y);
  y += lineHeight;
  centerText('Thank you for your understanding', y);

  return doc;
};

/**
 * Download refund receipt as PDF
 */
export const downloadRefundReceiptPdf = async (
  refund: RefundData & { refundReceiptNumber: string },
  storeInfo: StoreInfo
) => {
  const doc = await generateRefundReceiptPdf(refund, storeInfo);
  doc.save(`refund-${refund.refundReceiptNumber}.pdf`);
};
