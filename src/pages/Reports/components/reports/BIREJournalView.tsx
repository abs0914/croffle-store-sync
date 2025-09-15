import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Download, FileText, Printer, RefreshCw } from "lucide-react";
import { BIREJournalService, EJournalData } from "@/services/reports/modules/birEJournalService";
import { format } from "date-fns";
import { toast } from "sonner";

interface BIREJournalViewProps {
  storeId: string;
  date: Date | undefined;
}

export function BIREJournalView({ storeId, date }: BIREJournalViewProps) {
  const [isExporting, setIsExporting] = useState(false);
  const formattedDate = date ? format(date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
  
  const { data, isLoading } = useQuery({
    queryKey: ['bir-ejournal', storeId, formattedDate],
    queryFn: () => BIREJournalService.generateEJournal(storeId, formattedDate),
    enabled: !!storeId
  });
  
  const handleExportJSON = async () => {
    if (!data) return;
    
    setIsExporting(true);
    try {
      BIREJournalService.downloadJSON(data);
      toast.success("E-Journal exported successfully");
    } catch (error) {
      toast.error("Failed to export e-Journal");
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };
  
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-10 flex justify-center">
          <Spinner className="h-8 w-8" />
        </CardContent>
      </Card>
    );
  }
  
  if (!data) {
    return (
      <Card className="border-amber-200 bg-gradient-to-br from-amber-50/30 to-transparent">
        <CardContent className="p-8 text-center">
          <div className="space-y-6">
            <div className="flex flex-col items-center gap-4">
              <div className="rounded-full bg-amber-100 p-4">
                <FileText className="h-12 w-12 text-amber-600" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-muted-foreground">No E-Journal Data</h3>
                <p className="text-muted-foreground max-w-md">
                  No transaction data available for <strong>{format(new Date(formattedDate), 'MMMM dd, yyyy')}</strong>
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4 space-y-2">
                  <p className="text-sm text-blue-700 font-medium">E-Journal Requirements:</p>
                  <ul className="text-xs text-blue-600 space-y-1 text-left">
                    <li>• Completed transactions with receipt numbers</li>
                    <li>• Valid payment method records</li>
                    <li>• BIR-compliant transaction data</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 max-w-sm mx-auto">
              <Button variant="default" onClick={() => window.location.reload()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh Page
              </Button>
              <Button variant="outline" onClick={() => history.back()}>
                Go Back
              </Button>
            </div>

            <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">
              <p><strong>Selected Date:</strong> {format(new Date(formattedDate), 'EEEE, MMMM dd, yyyy')}</p>
              <p><strong>Store ID:</strong> {storeId.slice(0, 8)}...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="flex gap-2 justify-end print:hidden">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleExportJSON}
          disabled={isExporting}
        >
          <Download className="mr-2 h-4 w-4" />
          {isExporting ? "Exporting..." : "Export JSON"}
        </Button>
        <Button variant="outline" size="sm" onClick={handlePrint}>
          <Printer className="mr-2 h-4 w-4" />
          Print E-Journal
        </Button>
      </div>
      
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="text-center">
            <div className="space-y-2">
              <h1 className="text-xl font-bold">BIR ELECTRONIC JOURNAL</h1>
              <p className="text-sm font-normal">
                {format(new Date(formattedDate), 'MMMM dd, yyyy')}
              </p>
              <Badge variant="secondary">Terminal: {data.terminalId}</Badge>
            </div>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Summary Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Transaction Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Beginning Receipt:</span>
                  <span className="text-sm font-mono">{data.beginningReceiptNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Ending Receipt:</span>
                  <span className="text-sm font-mono">{data.endingReceiptNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Transaction Count:</span>
                  <span className="text-sm font-bold">{data.transactionCount}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Sales Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Gross Sales:</span>
                  <span className="text-sm font-bold">₱{data.grossSales.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Total Discounts:</span>
                  <span className="text-sm text-red-600">₱{data.totalDiscounts.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Net Sales:</span>
                  <span className="text-sm font-bold">₱{data.netSales.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* VAT Analysis */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">VAT Analysis</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">VATable Sales:</span>
                  <span className="text-sm">₱{data.vatSales.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">VAT Amount:</span>
                  <span className="text-sm">₱{data.vatAmount.toFixed(2)}</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">VAT Exempt:</span>
                  <span className="text-sm">₱{data.vatExemptSales.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Zero-Rated:</span>
                  <span className="text-sm">₱{data.zeroRatedSales.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Discount Breakdown */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Discount Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="flex justify-between">
                <span className="text-sm">Senior Citizen:</span>
                <span className="text-sm">₱{data.seniorDiscounts.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">PWD:</span>
                <span className="text-sm">₱{data.pwdDiscounts.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Transaction Details */}
          <div>
            <h3 className="text-sm font-semibold mb-4">Transaction Details</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {data.transactions.map((tx, index) => (
                <Card key={index} className="p-3">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-xs">
                    <div>
                      <span className="font-medium">Receipt:</span> {tx.receiptNumber}
                    </div>
                    <div>
                      <span className="font-medium">Seq:</span> {tx.sequenceNumber}
                    </div>
                    <div>
                      <span className="font-medium">Amount:</span> ₱{tx.netAmount.toFixed(2)}
                    </div>
                    <div>
                      <span className="font-medium">Payment:</span> {tx.paymentMethod}
                    </div>
                  </div>
                  {tx.discountAmount > 0 && (
                    <div className="mt-2 text-xs text-orange-600">
                      Discount: ₱{tx.discountAmount.toFixed(2)} ({tx.customerType})
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>

          <div className="text-center mt-8 text-xs text-muted-foreground">
            <p>--- END OF E-JOURNAL ---</p>
            <p>Generated on: {format(new Date(), 'yyyy-MM-dd HH:mm:ss')}</p>
            <p>This is a BIR-compliant electronic journal</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}