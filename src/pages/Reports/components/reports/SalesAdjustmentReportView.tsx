import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, FileText, AlertTriangle, RotateCcw, XCircle } from 'lucide-react';
import { formatCurrency, formatDateTime } from '@/utils';
import { fetchSalesAdjustmentReport, VoidTransaction, RefundTransaction } from '@/services/reports/modules/salesAdjustmentReport';

interface SalesAdjustmentReportViewProps {
  storeId: string;
  dateRange: {
    from: Date | undefined;
    to: Date | undefined;
  };
}

const voidReasonLabels: Record<string, string> = {
  customer_request: 'Customer Request',
  cashier_error: 'Cashier Error',
  system_error: 'System Error',
  management_decision: 'Management Decision',
  refund: 'Refund',
  exchange: 'Exchange',
  price_correction: 'Price Correction',
  item_unavailable: 'Item Unavailable',
  other: 'Other'
};

const refundReasonLabels: Record<string, string> = {
  defective_product: 'Defective Product',
  wrong_order: 'Wrong Order',
  customer_dissatisfied: 'Customer Dissatisfied',
  overcharge: 'Overcharge',
  duplicate_charge: 'Duplicate Charge',
  other: 'Other'
};

const getCategoryLabel = (category: string, isVoid: boolean): string => {
  const labels = isVoid ? voidReasonLabels : refundReasonLabels;
  return labels[category] || category?.replace(/_/g, ' ')?.replace(/\b\w/g, l => l.toUpperCase()) || 'Unknown';
};

export function SalesAdjustmentReportView({ storeId, dateRange }: SalesAdjustmentReportViewProps) {
  const { data: reportData, isLoading, error } = useQuery({
    queryKey: ['salesAdjustmentReport', storeId, dateRange?.from, dateRange?.to],
    queryFn: () => fetchSalesAdjustmentReport(storeId, dateRange),
    enabled: !!storeId
  });

  const handleExportCSV = () => {
    if (!reportData?.data) return;

    const { voidTransactions, refundTransactions } = reportData.data;

    // Voids CSV section
    const voidRows = voidTransactions.map(vt => [
      'VOID',
      vt.void_receipt_number,
      vt.original_receipt_number,
      formatDateTime(vt.void_date),
      getCategoryLabel(vt.void_reason_category, true),
      `"${vt.void_reason}"`,
      vt.original_total,
      vt.original_vat_amount,
      vt.voided_by_cashier_name,
      vt.authorized_by_name || 'N/A',
      vt.terminal_id
    ].join(','));

    // Refunds CSV section
    const refundRows = refundTransactions.map(rt => [
      'REFUND',
      rt.refund_receipt_number,
      rt.original_receipt_number,
      formatDateTime(rt.refund_date),
      getCategoryLabel(rt.refund_reason_category, false),
      `"${rt.refund_reason}"`,
      rt.refund_amount,
      rt.refund_vat_amount,
      rt.processed_by_name,
      rt.authorized_by_name || 'N/A',
      rt.terminal_id
    ].join(','));

    const csvContent = [
      ['Type', 'Adjustment Receipt', 'Original Receipt', 'Date', 'Category', 'Reason', 'Amount', 'VAT', 'Processed By', 'Authorized By', 'Terminal'].join(','),
      ...voidRows,
      ...refundRows
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-adjustment-report-${reportData.data.storeName}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !reportData?.data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Error Loading Sales Adjustment Report
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>Failed to load report data. Please try again later.</p>
        </CardContent>
      </Card>
    );
  }

  const { data: adjustmentData, metadata } = reportData;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 sales-adjustment-report-print">
      {/* Header */}
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h2 className="text-2xl font-bold">BIR Sales Adjustment Report</h2>
          <p className="text-muted-foreground">
            {adjustmentData.storeName} • {formatDateTime(adjustmentData.dateRange.from)} to {formatDateTime(adjustmentData.dateRange.to)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint} className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Print
          </Button>
          <Button onClick={handleExportCSV} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export for BIR
          </Button>
        </div>
      </div>

      {/* Print Header */}
      <div className="hidden print:block text-center mb-4">
        <h2 className="text-xl font-bold">BIR Sales Adjustment Report</h2>
        <p className="text-sm">Voids and Refunds</p>
        <p>{adjustmentData.storeName}</p>
        <p>{formatDateTime(adjustmentData.dateRange.from)} to {formatDateTime(adjustmentData.dateRange.to)}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Adjustments</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{adjustmentData.summary.totalAdjustments}</div>
            <p className="text-xs text-muted-foreground">
              {adjustmentData.summary.totalVoids} voids, {adjustmentData.summary.totalRefunds} refunds
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(adjustmentData.summary.totalAdjustmentAmount)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Void Amount</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(adjustmentData.summary.totalVoidAmount)}
            </div>
            <p className="text-xs text-muted-foreground">{adjustmentData.summary.totalVoids} transactions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Refund Amount</CardTitle>
            <RotateCcw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(adjustmentData.summary.totalRefundAmount)}
            </div>
            <p className="text-xs text-muted-foreground">{adjustmentData.summary.totalRefunds} transactions</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabbed Content */}
      <Tabs defaultValue="voids" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="voids" className="flex items-center gap-2">
            <XCircle className="h-4 w-4" />
            Void Transactions ({adjustmentData.summary.totalVoids})
          </TabsTrigger>
          <TabsTrigger value="refunds" className="flex items-center gap-2">
            <RotateCcw className="h-4 w-4" />
            Refund Transactions ({adjustmentData.summary.totalRefunds})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="voids" className="space-y-4">
          <VoidTransactionsTable voids={adjustmentData.voidTransactions} />
          <VoidSummaryByCategory categories={adjustmentData.summary.voidsByCategory} />
        </TabsContent>

        <TabsContent value="refunds" className="space-y-4">
          <RefundTransactionsTable refunds={adjustmentData.refundTransactions} />
          <RefundSummaryByCategory categories={adjustmentData.summary.refundsByCategory} />
        </TabsContent>
      </Tabs>

      {/* BIR Compliance Notice */}
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-800">
            <AlertTriangle className="h-5 w-5" />
            BIR Compliance Notice
          </CardTitle>
        </CardHeader>
        <CardContent className="text-orange-700">
          <p>
            This sales adjustment report complies with BIR requirements for documenting transaction voids and refunds.
            All adjustments are tracked with proper authorization, reasons, and audit trail including the original
            receipt/invoice number being adjusted. Ensure this report is submitted as part of your BIR filing requirements.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// Void Transactions Table Component
function VoidTransactionsTable({ voids }: { voids: VoidTransaction[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Void Transactions</CardTitle>
        <CardDescription>
          Detailed list of all voided transactions for BIR compliance
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Void Receipt</th>
                <th className="text-left p-2">Original SI #</th>
                <th className="text-left p-2">Void Date</th>
                <th className="text-left p-2">Category</th>
                <th className="text-left p-2">Reason</th>
                <th className="text-right p-2">Amount</th>
                <th className="text-left p-2">Voided By</th>
                <th className="text-left p-2">Authorized By</th>
              </tr>
            </thead>
            <tbody>
              {voids.map((vt) => (
                <tr key={vt.id} className="border-b hover:bg-muted/50">
                  <td className="p-2 font-mono">{vt.void_receipt_number}</td>
                  <td className="p-2 font-mono text-blue-600">{vt.original_receipt_number}</td>
                  <td className="p-2">{formatDateTime(vt.void_date)}</td>
                  <td className="p-2">
                    <Badge variant="outline" className="bg-orange-100 text-orange-800">
                      {getCategoryLabel(vt.void_reason_category, true)}
                    </Badge>
                  </td>
                  <td className="p-2 max-w-xs truncate" title={vt.void_reason}>
                    {vt.void_reason}
                  </td>
                  <td className="p-2 text-right font-mono text-red-600">
                    {formatCurrency(vt.original_total)}
                  </td>
                  <td className="p-2">{vt.voided_by_cashier_name}</td>
                  <td className="p-2">{vt.authorized_by_name || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {voids.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No void transactions found for the selected period.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Refund Transactions Table Component
function RefundTransactionsTable({ refunds }: { refunds: RefundTransaction[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Refund Transactions</CardTitle>
        <CardDescription>
          Detailed list of all refund transactions for BIR compliance
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Refund Receipt</th>
                <th className="text-left p-2">Original SI #</th>
                <th className="text-left p-2">Refund Date</th>
                <th className="text-left p-2">Type</th>
                <th className="text-left p-2">Category</th>
                <th className="text-left p-2">Reason</th>
                <th className="text-right p-2">Amount</th>
                <th className="text-left p-2">Processed By</th>
                <th className="text-left p-2">Authorized By</th>
              </tr>
            </thead>
            <tbody>
              {refunds.map((rt) => (
                <tr key={rt.id} className="border-b hover:bg-muted/50">
                  <td className="p-2 font-mono">{rt.refund_receipt_number}</td>
                  <td className="p-2 font-mono text-blue-600">{rt.original_receipt_number}</td>
                  <td className="p-2">{formatDateTime(rt.refund_date)}</td>
                  <td className="p-2">
                    <Badge variant={rt.refund_type === 'full' ? 'destructive' : 'secondary'}>
                      {rt.refund_type === 'full' ? 'Full' : 'Partial'}
                    </Badge>
                  </td>
                  <td className="p-2">
                    <Badge variant="outline" className="bg-blue-100 text-blue-800">
                      {getCategoryLabel(rt.refund_reason_category, false)}
                    </Badge>
                  </td>
                  <td className="p-2 max-w-xs truncate" title={rt.refund_reason}>
                    {rt.refund_reason}
                  </td>
                  <td className="p-2 text-right font-mono text-red-600">
                    {formatCurrency(rt.refund_amount)}
                  </td>
                  <td className="p-2">{rt.processed_by_name}</td>
                  <td className="p-2">{rt.authorized_by_name || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {refunds.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No refund transactions found for the selected period.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Void Summary by Category Component
function VoidSummaryByCategory({ categories }: { categories: Array<{ category: string; count: number; amount: number }> }) {
  if (categories.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Void Summary by Category</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <div key={category.category} className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <Badge variant="outline" className="bg-orange-100 text-orange-800">
                  {getCategoryLabel(category.category, true)}
                </Badge>
                <span className="text-sm font-medium">{category.count}</span>
              </div>
              <div className="text-lg font-bold text-red-600">
                {formatCurrency(category.amount)}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Refund Summary by Category Component
function RefundSummaryByCategory({ categories }: { categories: Array<{ category: string; count: number; amount: number }> }) {
  if (categories.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Refund Summary by Category</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <div key={category.category} className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <Badge variant="outline" className="bg-blue-100 text-blue-800">
                  {getCategoryLabel(category.category, false)}
                </Badge>
                <span className="text-sm font-medium">{category.count}</span>
              </div>
              <div className="text-lg font-bold text-red-600">
                {formatCurrency(category.amount)}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
