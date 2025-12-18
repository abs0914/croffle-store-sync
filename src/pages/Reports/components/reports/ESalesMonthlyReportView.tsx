import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Download, FileText, Calendar, TrendingUp, Receipt, History, Save, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { 
  generateESalesReport, 
  saveESalesReport,
  getESalesReportHistory,
  generateESalesFileContent,
  ESalesMonthlyReport,
  ESalesReportHistory
} from '@/services/reports/modules/esalesMonthlyReport';
import { APP_VERSION } from '@/config/appVersion';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';

interface ESalesMonthlyReportViewProps {
  storeId: string;
}

const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

export function ESalesMonthlyReportView({ storeId }: ESalesMonthlyReportViewProps) {
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [report, setReport] = useState<ESalesMonthlyReport | null>(null);
  const [history, setHistory] = useState<ESalesReportHistory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Generate year options (current year and past 5 years)
  const years = Array.from({ length: 6 }, (_, i) => currentDate.getFullYear() - i);

  useEffect(() => {
    loadReport();
    loadHistory();
  }, [storeId, selectedYear, selectedMonth]);

  const loadReport = async () => {
    if (!storeId) return;
    setIsLoading(true);
    const data = await generateESalesReport(storeId, selectedYear, selectedMonth);
    setReport(data);
    setIsLoading(false);
  };

  const loadHistory = async () => {
    if (!storeId) return;
    const data = await getESalesReportHistory(storeId);
    setHistory(data);
  };

  const handleSaveReport = async () => {
    if (!report) return;
    setIsSaving(true);
    const success = await saveESalesReport(report);
    setIsSaving(false);
    if (success) {
      toast.success('Report saved successfully');
      loadHistory();
    } else {
      toast.error('Failed to save report');
    }
  };

  const handleDownloadTxt = () => {
    if (!report) return;
    const content = generateESalesFileContent(report);
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `esales-${report.reportingMonth}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('BIR eSales file downloaded');
  };

  const handleDownloadPdf = () => {
    if (!report) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('BIR eSALES MONTHLY SALES REPORT', pageWidth / 2, 15, { align: 'center' });
    doc.text('(Per RMO 12-2012)', pageWidth / 2, 22, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(report.storeName, pageWidth / 2, 32, { align: 'center' });
    doc.text(report.storeAddress, pageWidth / 2, 37, { align: 'center' });
    doc.text(`TIN: ${report.tin}`, pageWidth / 2, 42, { align: 'center' });
    doc.text(`MIN: ${report.machineIdentificationNumber}`, pageWidth / 2, 47, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.text(`Reporting Period: ${format(new Date(report.reportingYear, report.reportingMonthNumber - 1), 'MMMM yyyy')}`, pageWidth / 2, 55, { align: 'center' });

    let yPos = 70;

    // Sales Breakdown
    doc.setFont('helvetica', 'bold');
    doc.text('SALES BREAKDOWN', 14, yPos);
    yPos += 8;

    autoTable(doc, {
      startY: yPos,
      head: [['Description', 'Amount (PHP)']],
      body: [
        ['VATable Sales (Net of VAT)', formatCurrency(report.vatableSales)],
        ['VAT Amount (12%)', formatCurrency(report.vatAmount)],
        ['VAT Zero-Rated Sales', formatCurrency(report.vatZeroRatedSales)],
        ['VAT Exempt Sales', formatCurrency(report.vatExemptSales)],
        ['Other Percentage Tax Sales', formatCurrency(report.otherPercentageTaxSales)],
      ],
      styles: { fontSize: 10 },
      headStyles: { fillColor: [66, 66, 66] },
    });

    yPos = (doc as any).lastAutoTable?.finalY + 15 || yPos + 50;

    // Summary
    doc.setFont('helvetica', 'bold');
    doc.text('SUMMARY', 14, yPos);
    yPos += 8;

    autoTable(doc, {
      startY: yPos,
      head: [['Description', 'Value']],
      body: [
        ['Gross Sales', formatCurrency(report.grossSales)],
        ['Total Discounts', formatCurrency(report.totalDiscounts)],
        ['Net Sales', formatCurrency(report.netSales)],
        ['Total Transactions', report.totalTransactions.toString()],
        ['First SI No.', report.firstReceiptNumber || 'N/A'],
        ['Last SI No.', report.lastReceiptNumber || 'N/A'],
      ],
      styles: { fontSize: 10 },
      headStyles: { fillColor: [66, 66, 66] },
    });

    // Footer
    doc.setFontSize(8);
    doc.text(`Generated by ${APP_VERSION.name} v${APP_VERSION.version}`, 14, doc.internal.pageSize.getHeight() - 10);
    doc.text(`Generated: ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}`, pageWidth - 14, doc.internal.pageSize.getHeight() - 10, { align: 'right' });

    doc.save(`esales-${report.reportingMonth}.pdf`);
    toast.success('PDF downloaded');
  };

  const formatCurrency = (amount: number) => `P${amount.toFixed(2)}`;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'submitted':
        return <Badge className="bg-green-500">Submitted</Badge>;
      case 'amended':
        return <Badge className="bg-orange-500">Amended</Badge>;
      default:
        return <Badge variant="secondary">Draft</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Period Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            BIR eSales Monthly Report (RMO 12-2012)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium">Year</label>
              <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map(year => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Month</label>
              <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map(month => (
                    <SelectItem key={month.value} value={month.value.toString()}>{month.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={loadReport}>
              Generate Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {report && (
        <>
          {/* Store & Machine Info */}
          <Card>
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Store Name</p>
                  <p className="font-medium">{report.storeName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">TIN</p>
                  <p className="font-medium">{report.tin}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Machine ID (MIN)</p>
                  <p className="font-medium">{report.machineIdentificationNumber}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  {getStatusBadge(report.submissionStatus)}
                </div>
              </div>
            </CardContent>
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
                  <Receipt className="h-4 w-4 text-purple-500" />
                  <p className="text-sm text-muted-foreground">VAT Collected</p>
                </div>
                <p className="text-2xl font-bold">{formatCurrency(report.vatAmount)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-orange-500" />
                  <p className="text-sm text-muted-foreground">Transactions</p>
                </div>
                <p className="text-2xl font-bold">{report.totalTransactions}</p>
              </CardContent>
            </Card>
          </div>

          {/* Sales Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sales Breakdown (Per RMO 12-2012)</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>VATable Sales (Net of VAT)</TableCell>
                    <TableCell className="text-right">{formatCurrency(report.vatableSales)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>VAT Amount (12%)</TableCell>
                    <TableCell className="text-right">{formatCurrency(report.vatAmount)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>VAT Zero-Rated Sales</TableCell>
                    <TableCell className="text-right">{formatCurrency(report.vatZeroRatedSales)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>VAT Exempt Sales</TableCell>
                    <TableCell className="text-right">{formatCurrency(report.vatExemptSales)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Other Percentage Tax Sales</TableCell>
                    <TableCell className="text-right">{formatCurrency(report.otherPercentageTaxSales)}</TableCell>
                  </TableRow>
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell>Total Discounts</TableCell>
                    <TableCell className="text-right text-green-600">{formatCurrency(report.totalDiscounts)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Receipt Range */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Receipt Range</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">First SI No.</p>
                  <p className="font-bold">{report.firstReceiptNumber || 'N/A'}</p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Last SI No.</p>
                  <p className="font-bold">{report.lastReceiptNumber || 'N/A'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex flex-wrap gap-2">
                <Button onClick={handleSaveReport} disabled={isSaving}>
                  <Save className="h-4 w-4 mr-1" />
                  {isSaving ? 'Saving...' : 'Save Report'}
                </Button>
                <Button variant="outline" onClick={handleDownloadTxt}>
                  <Download className="h-4 w-4 mr-1" />
                  Download BIR File (.txt)
                </Button>
                <Button variant="outline" onClick={handleDownloadPdf}>
                  <FileText className="h-4 w-4 mr-1" />
                  Download PDF
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Download the BIR file (.txt) for upload to the BIR eSales System portal.
              </p>
            </CardContent>
          </Card>
        </>
      )}

      {/* Submission History */}
      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <History className="h-4 w-4" />
              Submission History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>SRN</TableHead>
                  <TableHead className="text-right">Gross Sales</TableHead>
                  <TableHead className="text-right">Net Sales</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{format(new Date(item.reportingMonth + '-01'), 'MMMM yyyy')}</TableCell>
                    <TableCell>{getStatusBadge(item.submissionStatus)}</TableCell>
                    <TableCell>{item.salesReportNumber || '-'}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.grossSales)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.netSales)}</TableCell>
                    <TableCell>{format(new Date(item.createdAt), 'MM/dd/yyyy')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
