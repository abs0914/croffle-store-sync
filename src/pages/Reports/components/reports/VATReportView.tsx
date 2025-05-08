
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
  
  const { data, isLoading } = useQuery({
    queryKey: ['vat-report', storeId, from, to],
    queryFn: () => from && to ? fetchVATReport(storeId, from, to) : Promise.resolve(null),
    enabled: !!storeId && !!from && !!to
  });
  
  const handleExportCSV = () => {
    if (!data) return;
    
    // Generate CSV content
    const headers = ["Date", "Receipt No.", "Transaction Type", "VATable Sales", "VAT Amount", "VAT Exempt Sales", "Zero-Rated Sales"];
    const rows = data.transactions.map(tx => [
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
      data.totals.vatableSales.toFixed(2),
      data.totals.vatAmount.toFixed(2),
      data.totals.vatExemptSales.toFixed(2),
      data.totals.vatZeroRatedSales.toFixed(2)
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
  
  if (!data) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="text-center py-10">
            <p>No VAT data available for the selected period</p>
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
              <h3 className="text-2xl font-bold text-croffle-primary">₱{data.totals.vatableSales.toFixed(2)}</h3>
            </div>
            <div className="bg-croffle-light/20 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">VAT Amount</p>
              <h3 className="text-2xl font-bold text-croffle-primary">₱{data.totals.vatAmount.toFixed(2)}</h3>
            </div>
            <div className="bg-croffle-light/20 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">VAT-Exempt Sales</p>
              <h3 className="text-2xl font-bold text-croffle-primary">₱{data.totals.vatExemptSales.toFixed(2)}</h3>
            </div>
            <div className="bg-croffle-light/20 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">Zero-Rated Sales</p>
              <h3 className="text-2xl font-bold text-croffle-primary">₱{data.totals.vatZeroRatedSales.toFixed(2)}</h3>
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
                {data.transactions.map((tx, index) => (
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
                  <TableCell className="text-right">₱{data.totals.vatableSales.toFixed(2)}</TableCell>
                  <TableCell className="text-right">₱{data.totals.vatAmount.toFixed(2)}</TableCell>
                  <TableCell className="text-right">₱{data.totals.vatExemptSales.toFixed(2)}</TableCell>
                  <TableCell className="text-right">₱{data.totals.vatZeroRatedSales.toFixed(2)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
          
          <p className="text-sm text-muted-foreground mt-2">
            Showing {data.transactions.length} transactions
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
