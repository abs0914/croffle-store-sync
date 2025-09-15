
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Printer, RefreshCw, FileBarChart } from "lucide-react";
import { fetchXReading } from "@/services/reports";
import { format } from "date-fns";

interface XReadingViewProps {
  storeId: string;
  date: Date | undefined;
}

export function XReadingView({ storeId, date }: XReadingViewProps) {
  const formattedDate = date ? format(date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['x-reading', storeId, formattedDate],
    queryFn: async () => {
      console.log(`🔍 X-Reading View: Fetching data for store ${storeId.slice(0, 8)} on ${formattedDate}`);
      
      // Ensure we have a valid storeId
      if (!storeId || storeId === '') {
        console.error('❌ X-Reading View: No valid storeId provided');
        throw new Error('Store ID is required for X-Reading report');
      }
      
      try {
        const result = await fetchXReading(storeId, formattedDate);
        console.log(`📊 X-Reading View: Result for ${storeId.slice(0, 8)}:`, result ? 'Data received' : 'No data');
        return result;
      } catch (error: any) {
        // Handle authentication errors specifically
        if (error.message?.includes('Authentication required') || error.message?.includes('no active session')) {
          console.error('❌ X-Reading authentication error:', error);
          throw new Error('Session expired. Please refresh the page and login again.');
        }
        throw error;
      }
    },
    enabled: !!storeId && storeId !== '',
    retry: (failureCount, error: any) => {
      // Don't retry authentication errors
      if (error?.message?.includes('Authentication required') || error?.message?.includes('Session expired')) {
        return false;
      }
      return failureCount < 2;
    },
    refetchOnWindowFocus: false
  });
  
  const handlePrint = () => {
    window.print();
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
      <Card className="border-amber-200 bg-gradient-to-br from-amber-50/30 to-transparent">
        <CardContent className="p-8 text-center">
          <div className="space-y-6">
            <div className="flex flex-col items-center gap-4">
              <div className="rounded-full bg-amber-100 p-4">
                <FileBarChart className="h-12 w-12 text-amber-600" />
              </div>
              
              {error ? (
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-destructive">X-Reading Error</h3>
                  <p className="text-muted-foreground max-w-md">
                    {error instanceof Error ? error.message : 'Unable to generate X-Reading report.'}
                  </p>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-4">
                    <p className="text-sm text-red-700">
                      This could be due to authentication issues or missing transaction data.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-muted-foreground">No X-Reading Data</h3>
                  <p className="text-muted-foreground max-w-md">
                    No transactions found for <strong>{format(new Date(formattedDate), 'MMMM dd, yyyy')}</strong>
                  </p>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4 space-y-2">
                    <p className="text-sm text-blue-700 font-medium">Possible reasons:</p>
                    <ul className="text-xs text-blue-600 space-y-1 text-left">
                      <li>• No transactions were completed on this date</li>
                      <li>• No active cashier shift for the selected date</li>
                      <li>• Data may still be processing</li>
                    </ul>
                  </div>
                </div>
              )}
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
      <div className="text-right">
        <Button variant="outline" size="sm" onClick={handlePrint} className="print:hidden">
          <Printer className="mr-2 h-4 w-4" />
          Print X-Reading
        </Button>
      </div>
      
      <Card className="bg-white">
        <CardContent className="p-8">
          <div className="text-center mb-6">
            <h2 className="text-lg font-bold uppercase">{data.storeName}</h2>
            <p className="text-sm">{data.storeAddress}</p>
            <p className="text-sm">{data.contactInfo}</p>
            {data.taxId && <p className="text-sm">TIN: {data.taxId}</p>}
          </div>
          
          <div className="text-center mb-6">
            <h1 className="text-xl font-bold">X-READING REPORT</h1>
            <p>{format(new Date(formattedDate), 'MMMM dd, yyyy')}</p>
            <p className="text-sm">Report Generated: {format(new Date(), 'MM/dd/yyyy hh:mm:ss a')}</p>
          </div>
          
          <div className="mb-4">
            <p><strong>Cashier:</strong> {data.cashierName}</p>
            <p><strong>Terminal:</strong> {data.terminal}</p>
            <div className="mt-2 p-2 bg-muted rounded text-sm">
              {data.cashierName === "No Active Shift" ? (
                <div className="text-amber-600">
                  ⚠️ <strong>Warning:</strong> No active shift found for this date. 
                  This report shows completed transactions only.
                </div>
              ) : (
                <div className="text-green-600">
                  ✓ <strong>Active Shift:</strong> Report generated from current shift data.
                </div>
              )}
            </div>
          </div>
          
          <Separator className="my-4" />
          
          <div className="grid grid-cols-2 gap-2 mb-4">
            <p>Beginning OR #:</p>
            <p className="text-right">{data.beginningReceiptNumber}</p>
            
            <p>Ending OR #:</p>
            <p className="text-right">{data.endingReceiptNumber}</p>
            
            <p>Transaction Count:</p>
            <p className="text-right">{data.transactionCount}</p>
          </div>
          
          <Separator className="my-4" />
          
          <div className="grid grid-cols-2 gap-2 mb-4 font-medium">
            <p>GROSS SALES</p>
            <p className="text-right">₱{data.grossSales.toFixed(2)}</p>
            
            <p className="pl-4 text-sm">VATable Sales</p>
            <p className="text-right text-sm">₱{data.vatableSales.toFixed(2)}</p>
            
            <p className="pl-4 text-sm">VAT Exempt Sales</p>
            <p className="text-right text-sm">₱{data.vatExemptSales.toFixed(2)}</p>
            
            <p className="pl-4 text-sm">VAT Zero-Rated Sales</p>
            <p className="text-right text-sm">₱{data.vatZeroRatedSales.toFixed(2)}</p>
          </div>
          
          <div className="grid grid-cols-2 gap-2 mb-4">
            <p>LESS: DISCOUNTS</p>
            <p className="text-right">₱{data.totalDiscounts.toFixed(2)}</p>
            
            <p className="pl-4 text-sm">Senior Citizen</p>
            <p className="text-right text-sm">₱{data.seniorDiscount.toFixed(2)}</p>
            
            <p className="pl-4 text-sm">PWD</p>
            <p className="text-right text-sm">₱{data.pwdDiscount.toFixed(2)}</p>
            
            <p className="pl-4 text-sm">Employee</p>
            <p className="text-right text-sm">₱{data.employeeDiscount.toFixed(2)}</p>
            
            <p className="pl-4 text-sm">Other Discounts</p>
            <p className="text-right text-sm">₱{data.otherDiscounts.toFixed(2)}</p>
          </div>
          
          <div className="grid grid-cols-2 gap-2 mb-4">
            <p className="font-medium">NET SALES</p>
            <p className="text-right font-medium">₱{data.netSales.toFixed(2)}</p>
          </div>
          
          <Separator className="my-4" />
          
          <div className="grid grid-cols-2 gap-2 mb-4">
            <p className="font-medium">VAT ANALYSIS</p>
            <p className="text-right"></p>
            
            <p className="pl-4 text-sm">VAT Amount</p>
            <p className="text-right text-sm">₱{data.vatAmount.toFixed(2)}</p>
            
            <p className="pl-4 text-sm">VAT Exempt</p>
            <p className="text-right text-sm">₱{data.vatExempt.toFixed(2)}</p>
            
            <p className="pl-4 text-sm">VAT Zero-Rated</p>
            <p className="text-right text-sm">₱{data.vatZeroRated.toFixed(2)}</p>
          </div>
          
          <Separator className="my-4" />
          
          <div className="grid grid-cols-2 gap-2 mb-4">
            <p className="font-medium">PAYMENT SUMMARY</p>
            <p className="text-right"></p>
            
            <p className="pl-4 text-sm">Cash</p>
            <p className="text-right text-sm">₱{data.cashPayments.toFixed(2)}</p>
            
            <p className="pl-4 text-sm">Credit/Debit Card</p>
            <p className="text-right text-sm">₱{data.cardPayments.toFixed(2)}</p>
            
            <p className="pl-4 text-sm">E-Wallet</p>
            <p className="text-right text-sm">₱{data.eWalletPayments.toFixed(2)}</p>
            
            <p className="font-medium">TOTAL PAYMENTS</p>
            <p className="text-right font-medium">₱{data.totalPayments.toFixed(2)}</p>
          </div>
          
          <div className="text-center mt-8 text-sm">
            <p>THIS IS NOT A VALID RECEIPT FOR ACCOUNTING PURPOSES</p>
            <p>X-Reading is for monitoring purposes only</p>
            <div className="mt-4 text-xs text-muted-foreground">
              <p>Bureau of Internal Revenue (BIR) Compliance Report</p>
              <p>For internal monitoring and audit purposes</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
