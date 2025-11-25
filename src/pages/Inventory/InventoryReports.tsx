import { useState } from "react";
import { useStore } from "@/contexts/StoreContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Download, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { fetchInventoryReport } from "@/services/reports/inventoryReport";
import { InventoryReportView } from "@/pages/Reports/components/reports/InventoryReportView";
import { toast } from "sonner";

export default function InventoryReports() {
  const { currentStore } = useStore();
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });

  const { data: reportData, isLoading, error, refetch } = useQuery({
    queryKey: ['inventory-report', currentStore?.id, dateRange.from, dateRange.to],
    queryFn: () => {
      if (!currentStore?.id) return null;
      return fetchInventoryReport(currentStore.id, dateRange.from, dateRange.to);
    },
    enabled: !!currentStore?.id,
  });

  const handleExport = () => {
    if (!reportData) {
      toast.error("No data to export");
      return;
    }
    
    // Create CSV content
    const headers = ['Item Name', 'SKU', 'Initial Stock', 'Current Stock', 'Sold Units', 'Low Stock Threshold'];
    const rows = reportData.inventoryItems.map(item => [
      item.name,
      item.sku,
      item.initialStock,
      item.currentStock,
      item.soldUnits,
      item.threshold
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-report-${dateRange.from}-to-${dateRange.to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success("Report exported successfully");
  };

  if (!currentStore) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">
              Please select a store to view inventory reports.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Inventory Reports</h1>
          <p className="text-muted-foreground">
            View inventory status and movement for {currentStore.name}
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">From:</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !dateRange.from && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from ? format(new Date(dateRange.from), "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={new Date(dateRange.from)}
                    onSelect={(date) => date && setDateRange(prev => ({ ...prev, from: date.toISOString().split('T')[0] }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">To:</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !dateRange.to && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.to ? format(new Date(dateRange.to), "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={new Date(dateRange.to)}
                    onSelect={(date) => date && setDateRange(prev => ({ ...prev, to: date.toISOString().split('T')[0] }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <Button onClick={() => refetch()} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>

            <Button onClick={handleExport} variant="outline" disabled={!reportData}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading && (
        <div className="text-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading report...</p>
        </div>
      )}

      {error && (
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-destructive">
              Failed to load inventory report. Please try again.
            </p>
          </CardContent>
        </Card>
      )}

      {reportData && (
        <InventoryReportView 
          data={reportData} 
          dateRange={{ 
            from: new Date(dateRange.from), 
            to: new Date(dateRange.to) 
          }}
        />
      )}
    </div>
  );
}
