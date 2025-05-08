
import { useState, useEffect } from "react";
import { Customer, Transaction } from "@/types";
import { fetchCustomerPurchaseHistory } from "@/services/transactions/customerDataService";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";

interface CustomerDetailViewProps {
  customer: Customer;
}

export default function CustomerDetailView({ customer }: CustomerDetailViewProps) {
  const [purchaseHistory, setPurchaseHistory] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (customer.id) {
      setIsLoading(true);
      fetchCustomerPurchaseHistory(customer.id)
        .then(history => {
          setPurchaseHistory(history);
          setIsLoading(false);
        })
        .catch(error => {
          console.error("Error fetching purchase history:", error);
          setIsLoading(false);
        });
    }
  }, [customer.id]);

  return (
    <div>
      <div className="mb-6 p-4 bg-muted/50 rounded-lg">
        <h2 className="text-xl font-bold mb-2">{customer.name}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div>
            <p className="text-sm font-medium">Phone</p>
            <p className="text-lg">{customer.phone}</p>
          </div>
          <div>
            <p className="text-sm font-medium">Email</p>
            <p className="text-lg">{customer.email || "—"}</p>
          </div>
        </div>
      </div>
      
      <Tabs defaultValue="purchase-history">
        <TabsList className="mb-4">
          <TabsTrigger value="purchase-history">Purchase History</TabsTrigger>
          <TabsTrigger value="notes" disabled>
            Notes
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="purchase-history" className="space-y-4">
          <h3 className="text-lg font-semibold">Recent Purchases</h3>
          
          {isLoading ? (
            <p className="text-center py-8">Loading purchase history...</p>
          ) : purchaseHistory.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              No purchase history found for this customer
            </p>
          ) : (
            <div className="space-y-3">
              {purchaseHistory.map(transaction => (
                <Card key={transaction.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium">Receipt #{transaction.receiptNumber}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(transaction.createdAt), "MMM d, yyyy h:mm a")}
                        </p>
                      </div>
                      <p className="font-bold text-lg">₱{transaction.total.toFixed(2)}</p>
                    </div>
                    
                    <p className="text-sm mb-1">
                      Items: {transaction.items.length} | 
                      Payment: {transaction.paymentMethod.toUpperCase()}
                    </p>
                    
                    <div className="mt-2 text-xs">
                      <details>
                        <summary className="cursor-pointer text-croffle-primary font-medium">
                          View Items
                        </summary>
                        <div className="mt-2 space-y-1 ml-2">
                          {transaction.items.map((item, index) => (
                            <p key={index}>
                              {item.name} x{item.quantity} - ₱{item.totalPrice.toFixed(2)}
                            </p>
                          ))}
                        </div>
                      </details>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
