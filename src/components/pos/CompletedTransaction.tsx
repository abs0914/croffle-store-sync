
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import ReceiptGenerator from "./ReceiptGenerator";
import { Transaction, Customer } from "@/types";

interface CompletedTransactionProps {
  transaction: Transaction;
  customer: Customer | null;
  startNewSale: () => void;
}

export default function CompletedTransaction({ 
  transaction,
  customer,
  startNewSale 
}: CompletedTransactionProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full max-w-md mx-auto">
      <div className="w-full text-center mb-6">
        <h1 className="text-2xl font-bold mb-2 text-green-600">Sale Complete!</h1>
        <p className="text-gray-600 mb-4">Transaction #{transaction.receiptNumber}</p>
      </div>
      
      <Card className="w-full mb-6">
        <CardContent className="p-4">
          <ReceiptGenerator 
            transaction={transaction}
            customer={customer}
          />
        </CardContent>
      </Card>
      
      <Button 
        onClick={startNewSale}
        className="w-full py-6 text-lg"
      >
        New Sale
      </Button>
    </div>
  );
}
