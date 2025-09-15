import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Download, FileText, AlertTriangle } from 'lucide-react';
import { formatCurrency, formatDateTime } from '@/utils';
import { fetchVoidReport } from '@/services/reports/modules/voidReport';
import { VoidReasonCategory } from '@/services/transactions/voidTransactionService';

interface VoidReportViewProps {
  storeId: string;
  dateRange: {
    from: Date | undefined;
    to: Date | undefined;
  };
}

const reasonCategoryLabels: Record<VoidReasonCategory, string> = {
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

const reasonCategoryColors: Record<VoidReasonCategory, string> = {
  customer_request: 'bg-blue-100 text-blue-800',
  cashier_error: 'bg-yellow-100 text-yellow-800',
  system_error: 'bg-red-100 text-red-800',
  management_decision: 'bg-purple-100 text-purple-800',
  refund: 'bg-green-100 text-green-800',
  exchange: 'bg-cyan-100 text-cyan-800',
  price_correction: 'bg-orange-100 text-orange-800',
  item_unavailable: 'bg-gray-100 text-gray-800',
  other: 'bg-slate-100 text-slate-800'
};

export function VoidReportView({ storeId, dateRange }: VoidReportViewProps) {
  const { data: reportData, isLoading, error } = useQuery({
    queryKey: ['voidReport', storeId, dateRange?.from, dateRange?.to],
    queryFn: () => fetchVoidReport(storeId, dateRange),
    enabled: !!storeId
  });

  const handleExportCSV = () => {
    if (!reportData?.data) return;

    const csvContent = [
      // Headers
      ['Void Receipt', 'Original Receipt', 'Void Date', 'Original Date', 'Category', 'Reason', 'Amount', 'VAT', 'Discount', 'Cashier', 'Authorized By', 'Terminal'].join(','),
      // Data rows
      ...reportData.data.voidTransactions.map(vt => [
        vt.void_receipt_number,
        vt.original_receipt_number,
        formatDateTime(vt.void_date),
        formatDateTime(vt.original_transaction_date),
        reasonCategoryLabels[vt.void_reason_category],
        `"${vt.void_reason}"`,
        vt.original_total,
        vt.original_vat_amount,
        vt.original_discount_amount,
        vt.voided_by_cashier_name,
        vt.authorized_by_name || 'N/A',
        vt.terminal_id
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `void-report-${reportData.data.storeName}-${new Date().toISOString().split('T')[0]}.csv`;
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
            Error Loading Void Report
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>Failed to load void report data. Please try again later.</p>
        </CardContent>
      </Card>
    );
  }

  const { data: voidData, metadata } = reportData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">BIR Void Report</h2>
          <p className="text-muted-foreground">
            {voidData.storeName} • {formatDateTime(voidData.dateRange.from)} to {formatDateTime(voidData.dateRange.to)}
          </p>
        </div>
        <Button onClick={handleExportCSV} className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Export for BIR
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Voids</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{voidData.summary.totalVoids}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Void Amount</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(voidData.summary.totalVoidAmount)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Most Common Reason</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">
              {voidData.summary.voidsByCategory.length > 0
                ? reasonCategoryLabels[voidData.summary.voidsByCategory[0].category]
                : 'N/A'
              }
            </div>
            <div className="text-xs text-muted-foreground">
              {voidData.summary.voidsByCategory.length > 0
                ? `${voidData.summary.voidsByCategory[0].count} transactions`
                : ''
              }
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Data Source</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={metadata.dataSource === 'real' ? 'default' : 'secondary'}>
              {metadata.dataSource === 'real' ? 'Live Data' : 'Sample Data'}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Void Transactions Table */}
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
                  <th className="text-left p-2">Original Receipt</th>
                  <th className="text-left p-2">Void Date</th>
                  <th className="text-left p-2">Category</th>
                  <th className="text-left p-2">Reason</th>
                  <th className="text-right p-2">Amount</th>
                  <th className="text-left p-2">Cashier</th>
                  <th className="text-left p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {voidData.voidTransactions.map((vt) => (
                  <tr key={vt.id} className="border-b hover:bg-muted/50">
                    <td className="p-2 font-mono">{vt.void_receipt_number}</td>
                    <td className="p-2 font-mono">{vt.original_receipt_number}</td>
                    <td className="p-2">{formatDateTime(vt.void_date)}</td>
                    <td className="p-2">
                      <Badge className={reasonCategoryColors[vt.void_reason_category]}>
                        {reasonCategoryLabels[vt.void_reason_category]}
                      </Badge>
                    </td>
                    <td className="p-2 max-w-xs truncate" title={vt.void_reason}>
                      {vt.void_reason}
                    </td>
                    <td className="p-2 text-right font-mono text-red-600">
                      {formatCurrency(vt.original_total)}
                    </td>
                    <td className="p-2">{vt.voided_by_cashier_name}</td>
                    <td className="p-2">
                      <Badge variant={vt.is_bir_reported ? 'default' : 'secondary'}>
                        {vt.is_bir_reported ? 'Reported' : 'Pending'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {voidData.voidTransactions.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No void transactions found for the selected period.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary by Category */}
      <Card>
        <CardHeader>
          <CardTitle>Void Summary by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {voidData.summary.voidsByCategory.map((category) => (
              <div key={category.category} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <Badge className={reasonCategoryColors[category.category]}>
                    {reasonCategoryLabels[category.category]}
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
            This void report complies with BIR requirements for transaction voiding documentation.
            All voided transactions are tracked with proper authorization, reasons, and audit trail.
            Ensure this report is submitted as part of your BIR filing requirements.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}