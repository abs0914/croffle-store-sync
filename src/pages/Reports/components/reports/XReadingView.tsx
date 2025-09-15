
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Printer } from "lucide-react";
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
      const result = await fetchXReading(storeId, formattedDate);
      console.log(`📊 X-Reading View: Result for ${storeId.slice(0, 8)}:`, result ? 'Data received' : 'No data');
      return result;
    },
    enabled: !!storeId,
    retry: 1,
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
      <Card>
        <CardContent className="p-4">
          <div className="text-center py-10">
            <div className="mb-4">
              {error ? (
                <>
                  <p className="text-lg font-semibold text-destructive">Error Loading X-Reading</p>
                  <p className="text-sm text-muted-foreground">
                    {error instanceof Error ? error.message : 'Unable to fetch X-Reading data. Please try again or contact support.'}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-lg font-semibold text-muted-foreground">No Data Available</p>
                  <p className="text-sm text-muted-foreground">
                    No transactions found for {format(new Date(formattedDate), 'MMMM dd, yyyy')}.
                    <br />
                    Try selecting a different date or check if there are completed transactions for this date.
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
