
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Printer, Download } from "lucide-react";
import { fetchDailySalesSummary } from "@/services/reports";
import { format } from "date-fns";
import { formatCurrency } from "@/utils/format";

interface DailySummaryViewProps {
  storeId: string;
  date: Date | undefined;
}

export function DailySummaryView({ storeId, date }: DailySummaryViewProps) {
  const formattedDate = date ? format(date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
  
  const { data, isLoading } = useQuery({
    queryKey: ['daily-summary', storeId, formattedDate],
    queryFn: () => fetchDailySalesSummary(storeId, formattedDate),
    enabled: !!storeId
  });
  
  const handlePrint = () => {
    window.print();
  };
  
  const handleExportCSV = () => {
    if (!data) return;
    
    // Generate CSV content
    const headers = ["Item", "Quantity", "Total Sales"];
    const rows = data.items.map(item => [
      item.name,
      item.quantity,
      item.totalSales.toFixed(2)
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
    link.setAttribute('download', `daily-sales-${formattedDate}.csv`);
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
            <p>No sales data available for {format(new Date(formattedDate), 'MMMM dd, yyyy')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={handleExportCSV} className="print:hidden">
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
        <Button variant="outline" size="sm" onClick={handlePrint} className="print:hidden">
          <Printer className="mr-2 h-4 w-4" />
          Print Report
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Daily Sales Summary: {format(new Date(formattedDate), 'MMMM dd, yyyy')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-croffle-light/20 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">Total Sales</p>
              <h3 className="text-2xl font-bold text-croffle-primary">{formatCurrency(data.totalSales)}</h3>
            </div>
            <div className="bg-croffle-light/20 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">Transactions</p>
              <h3 className="text-2xl font-bold text-croffle-primary">{data.transactionCount}</h3>
            </div>
            <div className="bg-croffle-light/20 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">Items Sold</p>
              <h3 className="text-2xl font-bold text-croffle-primary">{data.totalItemsSold}</h3>
            </div>
          </div>
          
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Total Sales</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.name}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.price)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.totalSales)}</TableCell>
                  </TableRow>
                ))}
                
                {/* Totals row */}
                <TableRow className="font-medium">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right">{data.totalItemsSold}</TableCell>
                  <TableCell className="text-right"></TableCell>
                  <TableCell className="text-right">{formatCurrency(data.totalSales)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Payment Methods</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {data.paymentMethods.map((method, index) => (
              <div key={index} className="bg-croffle-light/10 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">{method.method}</p>
                <h3 className="text-xl font-bold text-croffle-primary">{formatCurrency(method.amount)}</h3>
                <p className="text-xs text-muted-foreground">{method.percentage.toFixed(1)}% of sales</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
