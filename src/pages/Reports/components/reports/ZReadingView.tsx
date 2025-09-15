
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Printer } from "lucide-react";
import { fetchZReading } from "@/services/reports";
import { format } from "date-fns";

interface ZReadingViewProps {
  storeId: string;
  date: Date | undefined;
}

export function ZReadingView({ storeId, date }: ZReadingViewProps) {
  const formattedDate = date ? format(date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['z-reading', storeId, formattedDate],
    queryFn: async () => {
      console.log(`🔍 Z-Reading View: Fetching data for store ${storeId.slice(0, 8)} on ${formattedDate}`);
      
      // Ensure we have a valid storeId
      if (!storeId || storeId === '') {
        console.error('❌ Z-Reading View: No valid storeId provided');
        throw new Error('Store ID is required for Z-Reading report');
      }
      
      const result = await fetchZReading(storeId, formattedDate);
      console.log(`📊 Z-Reading View: Result for ${storeId.slice(0, 8)}:`, result ? 'Data received' : 'No data');
      return result;
    },
    enabled: !!storeId && storeId !== '',
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
                  <p className="text-lg font-semibold text-destructive">Error Loading Z-Reading</p>
                  <p className="text-sm text-muted-foreground">
                    {error instanceof Error ? error.message : 'Unable to fetch Z-Reading data. Please try again or contact support.'}
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
          Print Z-Reading
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
            <h1 className="text-xl font-bold">Z-READING REPORT</h1>
            <p>{format(new Date(formattedDate), 'MMMM dd, yyyy')}</p>
            <p className="text-sm">Report Generated: {format(new Date(), 'MM/dd/yyyy hh:mm:ss a')}</p>
          </div>
          
          <div className="mb-4">
            <p><strong>Store Manager:</strong> {data.storeManager}</p>
            <p><strong>Terminal:</strong> {data.terminal}</p>
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
            <p>DAILY SALES</p>
            <p className="text-right"></p>
            
            <p className="pl-4 text-sm">GROSS SALES</p>
            <p className="text-right text-sm">₱{data.grossSales.toFixed(2)}</p>
            
            <p className="pl-4 text-sm">VATable Sales</p>
            <p className="text-right text-sm">₱{data.vatableSales.toFixed(2)}</p>
            
            <p className="pl-4 text-sm">VAT Exempt Sales</p>
            <p className="text-right text-sm">₱{data.vatExemptSales.toFixed(2)}</p>
            
            <p className="pl-4 text-sm">VAT Zero-Rated Sales</p>
            <p className="text-right text-sm">₱{data.vatZeroRatedSales.toFixed(2)}</p>
          </div>
          
          <div className="grid grid-cols-2 gap-2 mb-4">
            <p>LESS: REFUNDS</p>
            <p className="text-right">₱{data.totalRefunds.toFixed(2)}</p>
            
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
          
          <Separator className="my-4" />
          
          <div className="grid grid-cols-2 gap-2 mb-4">
            <p className="font-medium">CASH DRAWER SUMMARY</p>
            <p className="text-right"></p>
            
            <p className="pl-4 text-sm">Beginning Cash</p>
            <p className="text-right text-sm">₱{data.beginningCash.toFixed(2)}</p>
            
            <p className="pl-4 text-sm">Cash Sales</p>
            <p className="text-right text-sm">₱{data.cashSales.toFixed(2)}</p>
            
            <p className="pl-4 text-sm">Cash Payouts</p>
            <p className="text-right text-sm">₱{data.cashPayouts.toFixed(2)}</p>
            
            <p className="pl-4 text-sm">Expected Cash</p>
            <p className="text-right text-sm">₱{data.expectedCash.toFixed(2)}</p>
            
            <p className="pl-4 text-sm">Actual Cash</p>
            <p className="text-right text-sm">₱{data.actualCash.toFixed(2)}</p>
            
            <p className="pl-4 text-sm font-medium">Cash Variance</p>
            <p className="text-right text-sm font-medium">₱{data.cashVariance.toFixed(2)}</p>
          </div>
          
          <div className="grid grid-cols-2 gap-2 mb-4">
            <p className="font-medium">ACCUMULATED TOTALS</p>
            <p className="text-right"></p>
            
            <p className="pl-4 text-sm">Gross Sales</p>
            <p className="text-right text-sm">₱{data.accumulatedGrossSales.toFixed(2)}</p>
            
            <p className="pl-4 text-sm">VAT Amount</p>
            <p className="text-right text-sm">₱{data.accumulatedVAT.toFixed(2)}</p>
          </div>
          
          <div className="mt-8 text-center">
            <p>--- END OF Z-READING REPORT ---</p>
            <p className="text-sm mt-2">This is an official BIR-compliant receipt</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
