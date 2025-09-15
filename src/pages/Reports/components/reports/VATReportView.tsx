
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { FileDown } from "lucide-react";
import { fetchVATReport } from "@/services/reports";
import { format } from "date-fns";

interface VATReportViewProps {
  storeId: string;
  dateRange: {
    from: Date | undefined;
    to: Date | undefined;
  };
}

export function VATReportView({ storeId, dateRange }: VATReportViewProps) {
  const from = dateRange.from?.toISOString().split('T')[0];
  const to = dateRange.to?.toISOString().split('T')[0];
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['vat-report', storeId, from, to],
    queryFn: async () => {
      if (!from || !to) return Promise.resolve(null);
      
      // Ensure we have valid parameters
      if (!storeId || storeId === '') {
        console.error('❌ VAT Report View: No valid storeId provided');
        throw new Error('Store ID is required for VAT report');
      }
      
      console.log(`🔍 VAT Report View: Fetching data for store ${storeId.slice(0, 8)} from ${from} to ${to}`);
      
      try {
        const result = await fetchVATReport(storeId, from, to);
        console.log(`📊 VAT Report View: Result for ${storeId.slice(0, 8)}:`, result ? 'Data received' : 'No data');
        return result;
      } catch (error: any) {
        // Handle authentication errors specifically
        if (error.message?.includes('Authentication required') || error.message?.includes('no active session')) {
          console.error('❌ VAT Report authentication error:', error);
          throw new Error('Session expired. Please refresh the page and login again.');
        }
        throw error;
      }
    },
    enabled: !!storeId && storeId !== '' && !!from && !!to,
    retry: (failureCount, error: any) => {
      // Don't retry authentication errors
      if (error?.message?.includes('Authentication required') || error?.message?.includes('Session expired')) {
        return false;
      }
      return failureCount < 2;
    },
    refetchOnWindowFocus: false
  });
  
  const handleExportCSV = () => {
    if (!reportData) return;
    
    // Generate CSV content
    const headers = ["Date", "Receipt No.", "Transaction Type", "VATable Sales", "VAT Amount", "VAT Exempt Sales", "Zero-Rated Sales"];
    const rows = reportData.transactions.map(tx => [
      format(new Date(tx.date), 'MM/dd/yyyy'),
      tx.receiptNumber,
      tx.transactionType,
      tx.vatableSales.toFixed(2),
      tx.vatAmount.toFixed(2),
      tx.vatExemptSales.toFixed(2),
      tx.vatZeroRatedSales.toFixed(2)
    ]);
    
    // Add summary row
    rows.push([
      "TOTAL", "", "", 
      reportData.totals.vatableSales.toFixed(2),
      reportData.totals.vatAmount.toFixed(2),
      reportData.totals.vatExemptSales.toFixed(2),
      reportData.totals.vatZeroRatedSales.toFixed(2)
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `vat-report-${from}-to-${to}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-10 flex justify-center">
          <Spinner className="h-8 w-8 text-croffle-accent" />
        </CardContent>
      </Card>
    );
  }
  
  // Extract the data from the response wrapper
  const reportData = data?.data || data;

  if (!reportData || !reportData.transactions || reportData.transactions.length === 0) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="text-center py-10">
            <div className="mb-4">
              {error ? (
                <>
                  <p className="text-lg font-semibold text-destructive">Error Loading VAT Report</p>
                  <p className="text-sm text-muted-foreground">
                    {error instanceof Error ? error.message : 'Unable to fetch VAT report data. Please try again or contact support.'}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-lg font-semibold text-muted-foreground">No Data Available</p>
                  <p className="text-sm text-muted-foreground">
                    No transactions found for the selected date range.
                    <br />
                    Try selecting a different date range or check if there are completed transactions for this period.
                  </p>
                </>
              )}
            </div>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  const dateRangeText = dateRange.from && dateRange.to
    ? `${format(dateRange.from, 'MMM dd, yyyy')} - ${format(dateRange.to, 'MMM dd, yyyy')}`
    : 'Custom Range';
  
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={handleExportCSV}>
          <FileDown className="mr-2 h-4 w-4" />
          Export for BIR
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">VAT Report Summary: {dateRangeText}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-croffle-light/20 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">VATable Sales</p>
              <h3 className="text-2xl font-bold text-croffle-primary">₱{reportData.totals.vatableSales.toFixed(2)}</h3>
            </div>
            <div className="bg-croffle-light/20 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">VAT Amount</p>
              <h3 className="text-2xl font-bold text-croffle-primary">₱{reportData.totals.vatAmount.toFixed(2)}</h3>
            </div>
            <div className="bg-croffle-light/20 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">VAT-Exempt Sales</p>
              <h3 className="text-2xl font-bold text-croffle-primary">₱{reportData.totals.vatExemptSales.toFixed(2)}</h3>
            </div>
            <div className="bg-croffle-light/20 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">Zero-Rated Sales</p>
              <h3 className="text-2xl font-bold text-croffle-primary">₱{reportData.totals.vatZeroRatedSales.toFixed(2)}</h3>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Transaction Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Receipt No.</TableHead>
                  <TableHead>Transaction Type</TableHead>
                  <TableHead className="text-right">VATable Sales</TableHead>
                  <TableHead className="text-right">VAT Amount</TableHead>
                  <TableHead className="text-right">VAT-Exempt Sales</TableHead>
                  <TableHead className="text-right">Zero-Rated Sales</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.transactions.map((tx, index) => (
                  <TableRow key={index}>
                    <TableCell>{format(new Date(tx.date), 'MM/dd/yyyy')}</TableCell>
                    <TableCell>{tx.receiptNumber}</TableCell>
                    <TableCell>{tx.transactionType}</TableCell>
                    <TableCell className="text-right">₱{tx.vatableSales.toFixed(2)}</TableCell>
                    <TableCell className="text-right">₱{tx.vatAmount.toFixed(2)}</TableCell>
                    <TableCell className="text-right">₱{tx.vatExemptSales.toFixed(2)}</TableCell>
                    <TableCell className="text-right">₱{tx.vatZeroRatedSales.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
                
                {/* Totals row */}
                <TableRow className="font-medium bg-muted/50">
                  <TableCell colSpan={3} className="text-right">TOTAL</TableCell>
                  <TableCell className="text-right font-medium">₱{reportData.totals.vatableSales.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-medium">₱{reportData.totals.vatAmount.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-medium">₱{reportData.totals.vatExemptSales.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-medium">₱{reportData.totals.vatZeroRatedSales.toFixed(2)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
          
          <p className="text-sm text-muted-foreground mt-2">
            Showing {reportData.transactions.length} transactions
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
