import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { UnifiedAuditEntry, SystemAuditTrailService } from './systemAuditTrailService';
import { format } from 'date-fns';

export interface AuditExportOptions {
  storeName: string;
  storeAddress: string;
  tin: string;
  startDate: string;
  endDate: string;
  entries: UnifiedAuditEntry[];
}

/**
 * Audit Trail Export Service - Handles PDF and CSV export for BIR compliance
 */
export class AuditTrailExportService {
  /**
   * Generate PDF report of audit trail
   */
  static generatePDF(options: AuditExportOptions): void {
    const { storeName, storeAddress, tin, startDate, endDate, entries } = options;
    
    const doc = new jsPDF('landscape', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('SYSTEM AUDIT TRAIL', pageWidth / 2, 15, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(storeName, pageWidth / 2, 22, { align: 'center' });
    doc.text(storeAddress, pageWidth / 2, 28, { align: 'center' });
    doc.text(`TIN: ${tin}`, pageWidth / 2, 34, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text(`Date Range: ${format(new Date(startDate), 'MMM dd, yyyy')} - ${format(new Date(endDate), 'MMM dd, yyyy')}`, pageWidth / 2, 42, { align: 'center' });
    
    // Table
    const tableData = entries.map(entry => [
      format(new Date(entry.timestamp), 'MM/dd/yyyy HH:mm:ss'),
      entry.userName || entry.userId?.slice(0, 8) || 'System',
      entry.activityType.replace(/_/g, ' ').toUpperCase(),
      entry.activity.replace(/_/g, ' '),
      SystemAuditTrailService.formatDataValues(entry.dataValues).slice(0, 80)
    ]);

    autoTable(doc, {
      startY: 48,
      head: [['Date & Time', 'User', 'Type', 'Activity', 'Data Values']],
      body: tableData,
      styles: {
        fontSize: 8,
        cellPadding: 2
      },
      headStyles: {
        fillColor: [66, 66, 66],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 30 },
        2: { cellWidth: 25 },
        3: { cellWidth: 40 },
        4: { cellWidth: 'auto' }
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      },
      didDrawPage: (data) => {
        // Footer on each page
        const pageCount = doc.getNumberOfPages();
        doc.setFontSize(8);
        doc.text(
          `Generated: ${format(new Date(), 'MMM dd, yyyy HH:mm:ss')} | PVOSyncPOS v1.0.0 | Page ${data.pageNumber} of ${pageCount}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }
    });
    
    // Add total count
    const finalY = (doc as any).lastAutoTable?.finalY || 48;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Entries: ${entries.length}`, 14, finalY + 10);
    
    // Download
    const filename = `audit-trail-${format(new Date(), 'yyyyMMdd-HHmmss')}.pdf`;
    doc.save(filename);
  }

  /**
   * Generate CSV export of audit trail
   */
  static generateCSV(options: AuditExportOptions): void {
    const { storeName, startDate, endDate, entries } = options;
    
    // CSV Header
    const headers = ['Date & Time', 'User ID', 'User Name', 'User Role', 'Activity Type', 'Activity', 'Data Values', 'Source'];
    
    // CSV Rows
    const rows = entries.map(entry => [
      format(new Date(entry.timestamp), 'yyyy-MM-dd HH:mm:ss'),
      entry.userId || '',
      entry.userName || '',
      entry.userRole || '',
      entry.activityType,
      entry.activity,
      `"${SystemAuditTrailService.formatDataValues(entry.dataValues).replace(/"/g, '""')}"`,
      entry.sourceTable
    ]);
    
    // Build CSV content
    const csvContent = [
      `# System Audit Trail - ${storeName}`,
      `# Date Range: ${startDate} to ${endDate}`,
      `# Generated: ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}`,
      `# Total Entries: ${entries.length}`,
      '',
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    // Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `audit-trail-${format(new Date(), 'yyyyMMdd-HHmmss')}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  /**
   * Generate browser print content
   */
  static generatePrintHTML(options: AuditExportOptions): string {
    const { storeName, storeAddress, tin, startDate, endDate, entries } = options;
    
    const tableRows = entries.map(entry => `
      <tr>
        <td>${format(new Date(entry.timestamp), 'MM/dd/yyyy HH:mm:ss')}</td>
        <td>${entry.userName || entry.userId?.slice(0, 8) || 'System'}</td>
        <td>${entry.activityType.replace(/_/g, ' ')}</td>
        <td>${entry.activity.replace(/_/g, ' ')}</td>
        <td style="max-width: 300px; word-wrap: break-word;">${SystemAuditTrailService.formatDataValues(entry.dataValues)}</td>
      </tr>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>System Audit Trail</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; font-size: 11px; }
          h1 { text-align: center; font-size: 18px; margin-bottom: 5px; }
          .header-info { text-align: center; margin-bottom: 15px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ccc; padding: 6px; text-align: left; }
          th { background-color: #333; color: white; font-weight: bold; }
          tr:nth-child(even) { background-color: #f5f5f5; }
          .footer { margin-top: 15px; text-align: center; font-size: 10px; color: #666; }
          @media print {
            body { margin: 10px; }
            th { background-color: #333 !important; color: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <h1>SYSTEM AUDIT TRAIL</h1>
        <div class="header-info">
          <div><strong>${storeName}</strong></div>
          <div>${storeAddress}</div>
          <div>TIN: ${tin}</div>
          <div style="margin-top: 10px;">Date Range: ${format(new Date(startDate), 'MMM dd, yyyy')} - ${format(new Date(endDate), 'MMM dd, yyyy')}</div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th style="width: 120px;">Date & Time</th>
              <th style="width: 100px;">User</th>
              <th style="width: 80px;">Type</th>
              <th style="width: 120px;">Activity</th>
              <th>Data Values</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
        
        <div class="footer">
          <div>Total Entries: ${entries.length}</div>
          <div>Generated: ${format(new Date(), 'MMM dd, yyyy HH:mm:ss')} | PVOSyncPOS v1.0.0</div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Open browser print dialog
   */
  static printBrowser(options: AuditExportOptions): void {
    const printContent = this.generatePrintHTML(options);
    const printWindow = window.open('', '_blank');
    
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
  }
}
