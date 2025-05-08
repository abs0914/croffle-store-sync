
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
  
  const { data, isLoading } = useQuery({
    queryKey: ['x-reading', storeId, formattedDate],
    queryFn: () => fetchXReading(storeId, formattedDate),
    enabled: !!storeId
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
            <p>No X-Reading data available for the selected date</p>
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
