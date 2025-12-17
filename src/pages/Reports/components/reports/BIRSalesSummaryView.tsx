
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Download, FileText, Printer, TrendingUp, Users, XCircle, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { fetchBIRSalesSummary, BIRSalesSummary } from '@/services/reports/modules/discountSalesReport';
import { APP_VERSION } from '@/config/appVersion';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface BIRSalesSummaryViewProps {
  storeId: string;
  dateRange: {
    from: Date | undefined;
    to: Date | undefined;
  };
}

export function BIRSalesSummaryView({ storeId, dateRange }: BIRSalesSummaryViewProps) {
  const [report, setReport] = useState<BIRSalesSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadReport() {
      if (!storeId || !dateRange.from || !dateRange.to) return;
      
      setIsLoading(true);
      const from = format(dateRange.from, 'yyyy-MM-dd');
      const to = format(dateRange.to, 'yyyy-MM-dd');
      
      const data = await fetchBIRSalesSummary(storeId, from, to);
      setReport(data);
      setIsLoading(false);
    }

    loadReport();
  }, [storeId, dateRange]);

  const formatCurrency = (amount: number) => `P${amount.toFixed(2)}`;

  const handleExportPDF = () => {
    if (!report) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('BIR SALES SUMMARY REPORT', pageWidth / 2, 15, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(report.storeName, pageWidth / 2, 22, { align: 'center' });
    doc.text(report.storeAddress, pageWidth / 2, 27, { align: 'center' });
    doc.text(`TIN: ${report.tin}`, pageWidth / 2, 32, { align: 'center' });
    doc.text(`Period: ${report.dateRange.from} to ${report.dateRange.to}`, pageWidth / 2, 40, { align: 'center' });

    let yPos = 50;

    // Sales Summary
    doc.setFont('helvetica', 'bold');
    doc.text('SALES SUMMARY', 14, yPos);
    yPos += 8;

    doc.setFont('helvetica', 'normal');
    const salesData = [
      ['Gross Sales', formatCurrency(report.grossSales)],
      ['Less: Total Discounts', formatCurrency(report.totalDiscounts)],
      ['Net Sales', formatCurrency(report.netSales)],
      ['VATable Sales', formatCurrency(report.vatableSales)],
      ['VAT Exempt Sales', formatCurrency(report.vatExemptSales)],
      ['Zero-Rated Sales', formatCurrency(report.vatZeroRatedSales)],
      ['VAT Amount (12%)', formatCurrency(report.vatAmount)],
    ];

    salesData.forEach(([label, value]) => {
      doc.text(label, 14, yPos);
      doc.text(value, 100, yPos, { align: 'right' });
      yPos += 6;
    });

    yPos += 8;

    // Discount Breakdown
    doc.setFont('helvetica', 'bold');
    doc.text('DISCOUNT BREAKDOWN', 14, yPos);
    yPos += 8;

    autoTable(doc, {
      startY: yPos,
      head: [['Discount Type', 'Count', 'Amount']],
      body: [
        ['Senior Citizen (20%)', report.discountBreakdown.senior.count.toString(), formatCurrency(report.discountBreakdown.senior.amount)],
        ['PWD (20%)', report.discountBreakdown.pwd.count.toString(), formatCurrency(report.discountBreakdown.pwd.amount)],
        ['National Athletes & Coaches (20%)', report.discountBreakdown.naac.count.toString(), formatCurrency(report.discountBreakdown.naac.amount)],
        ['Solo Parent (20%)', report.discountBreakdown.soloParent.count.toString(), formatCurrency(report.discountBreakdown.soloParent.amount)],
        ['Regular Discount', report.discountBreakdown.regular.count.toString(), formatCurrency(report.discountBreakdown.regular.amount)],
        ['Other Discounts', report.discountBreakdown.other.count.toString(), formatCurrency(report.discountBreakdown.other.amount)],
      ],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [66, 66, 66] },
    });

    yPos = (doc as any).lastAutoTable?.finalY + 10 || yPos + 60;

    // Adjustments
    doc.setFont('helvetica', 'bold');
    doc.text('ADJUSTMENTS', 14, yPos);
    yPos += 8;

    doc.setFont('helvetica', 'normal');
    doc.text(`Void Transactions: ${report.voidCount} (${formatCurrency(report.voidAmount)})`, 14, yPos);
    yPos += 6;
    doc.text(`Refunds: ${report.refundCount} (${formatCurrency(report.refundAmount)})`, 14, yPos);

    // Daily Breakdown (new page if needed)
    if (report.dailyBreakdown.length > 0) {
      doc.addPage();
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('DAILY SALES BREAKDOWN', 14, 15);

      autoTable(doc, {
        startY: 22,
        head: [['Date', 'Transactions', 'Gross Sales', 'Discounts', 'VAT', 'Net Sales']],
        body: report.dailyBreakdown.map(d => [
          format(new Date(d.date), 'MM/dd/yyyy'),
          d.transactionCount.toString(),
          formatCurrency(d.grossSales),
          formatCurrency(d.discountAmount),
          formatCurrency(d.vatAmount),
          formatCurrency(d.netSales),
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [66, 66, 66] },
      });
    }

    // Footer on all pages
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(`Generated by ${APP_VERSION.name} v${APP_VERSION.version}`, 14, doc.internal.pageSize.getHeight() - 10);
      doc.text(`Page ${i} of ${pageCount}`, pageWidth - 14, doc.internal.pageSize.getHeight() - 10, { align: 'right' });
    }

    doc.save(`bir-sales-summary-${report.dateRange.from}-to-${report.dateRange.to}.pdf`);
  };

  const handleExportCSV = () => {
    if (!report) return;

    const headers = ['Date', 'Transactions', 'Gross Sales', 'Discounts', 'VAT Amount', 'Net Sales'];
    const rows = report.dailyBreakdown.map(d => [
      d.date,
      d.transactionCount,
      d.grossSales.toFixed(2),
      d.discountAmount.toFixed(2),
      d.vatAmount.toFixed(2),
      d.netSales.toFixed(2),
    ]);

    const csvContent = [
      `BIR Sales Summary Report - ${report.storeName}`,
      `Period: ${report.dateRange.from} to ${report.dateRange.to}`,
      '',
      headers.join(','),
      ...rows.map(r => r.join(',')),
      '',
      `Total Transactions,${report.transactionCount}`,
      `Total Gross Sales,${report.grossSales.toFixed(2)}`,
      `Total Discounts,${report.totalDiscounts.toFixed(2)}`,
      `Total VAT,${report.vatAmount.toFixed(2)}`,
      `Total Net Sales,${report.netSales.toFixed(2)}`,
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bir-sales-summary-${report.dateRange.from}-to-${report.dateRange.to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!report || report.transactionCount === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <p className="text-lg font-medium mb-2">No Transactions Found</p>
          <p className="text-sm">No completed transactions for the selected date range.</p>
          <p className="text-xs mt-2">Try selecting a different date range or check if transactions have been recorded.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">BIR Sales Summary Report</CardTitle>
            <p className="text-sm text-muted-foreground">
              {report.storeName} • {report.dateRange.from} to {report.dateRange.to}
            </p>
            <p className="text-xs text-muted-foreground">TIN: {report.tin}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-1" />
              Print
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-1" />
              CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPDF}>
              <FileText className="h-4 w-4 mr-1" />
              PDF
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <p className="text-sm text-muted-foreground">Gross Sales</p>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(report.grossSales)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-500" />
              <p className="text-sm text-muted-foreground">Net Sales</p>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(report.netSales)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-500" />
              <p className="text-sm text-muted-foreground">Transactions</p>
            </div>
            <p className="text-2xl font-bold">{report.transactionCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-orange-500" />
              <p className="text-sm text-muted-foreground">VAT Collected</p>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(report.vatAmount)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Sales Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sales Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground">VATable Sales</p>
              <p className="text-lg font-bold">{formatCurrency(report.vatableSales)}</p>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground">VAT Exempt Sales</p>
              <p className="text-lg font-bold">{formatCurrency(report.vatExemptSales)}</p>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground">Zero-Rated Sales</p>
              <p className="text-lg font-bold">{formatCurrency(report.vatZeroRatedSales)}</p>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground">Total Discounts</p>
              <p className="text-lg font-bold text-green-600">{formatCurrency(report.totalDiscounts)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Discount Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Discount Breakdown by Type</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Discount Type</TableHead>
                <TableHead className="text-center">Count</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Senior Citizen (20%)</TableCell>
                <TableCell className="text-center">{report.discountBreakdown.senior.count}</TableCell>
                <TableCell className="text-right">{formatCurrency(report.discountBreakdown.senior.amount)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>PWD (20%)</TableCell>
                <TableCell className="text-center">{report.discountBreakdown.pwd.count}</TableCell>
                <TableCell className="text-right">{formatCurrency(report.discountBreakdown.pwd.amount)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>National Athletes & Coaches (20%)</TableCell>
                <TableCell className="text-center">{report.discountBreakdown.naac.count}</TableCell>
                <TableCell className="text-right">{formatCurrency(report.discountBreakdown.naac.amount)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Solo Parent (20%)</TableCell>
                <TableCell className="text-center">{report.discountBreakdown.soloParent.count}</TableCell>
                <TableCell className="text-right">{formatCurrency(report.discountBreakdown.soloParent.amount)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Regular Discount</TableCell>
                <TableCell className="text-center">{report.discountBreakdown.regular.count}</TableCell>
                <TableCell className="text-right">{formatCurrency(report.discountBreakdown.regular.amount)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Other Discounts</TableCell>
                <TableCell className="text-center">{report.discountBreakdown.other.count}</TableCell>
                <TableCell className="text-right">{formatCurrency(report.discountBreakdown.other.amount)}</TableCell>
              </TableRow>
              <TableRow className="bg-muted/50 font-bold">
                <TableCell>TOTAL</TableCell>
                <TableCell className="text-center">
                  {report.discountBreakdown.senior.count + report.discountBreakdown.pwd.count + 
                   report.discountBreakdown.naac.count + report.discountBreakdown.soloParent.count +
                   report.discountBreakdown.regular.count + report.discountBreakdown.other.count}
                </TableCell>
                <TableCell className="text-right">{formatCurrency(report.totalDiscounts)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Adjustments */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Adjustments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <XCircle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">Void Transactions</p>
                <p className="font-bold">{report.voidCount} ({formatCurrency(report.voidAmount)})</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <RotateCcw className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Refunds</p>
                <p className="font-bold">{report.refundCount} ({formatCurrency(report.refundAmount)})</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daily Breakdown */}
      {report.dailyBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Daily Sales Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-center">Transactions</TableHead>
                    <TableHead className="text-right">Gross Sales</TableHead>
                    <TableHead className="text-right">Discounts</TableHead>
                    <TableHead className="text-right">VAT</TableHead>
                    <TableHead className="text-right">Net Sales</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.dailyBreakdown.map((day) => (
                    <TableRow key={day.date}>
                      <TableCell>{format(new Date(day.date), 'MMM dd, yyyy')}</TableCell>
                      <TableCell className="text-center">{day.transactionCount}</TableCell>
                      <TableCell className="text-right">{formatCurrency(day.grossSales)}</TableCell>
                      <TableCell className="text-right text-green-600">{formatCurrency(day.discountAmount)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(day.vatAmount)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(day.netSales)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Footer */}
      <p className="text-xs text-muted-foreground text-center">
        Generated by {APP_VERSION.name} v{APP_VERSION.version} on {format(new Date(), 'MMMM dd, yyyy HH:mm:ss')}
      </p>
    </div>
  );
}
