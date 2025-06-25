
import { useState, useEffect } from "react";
import { Customer, Transaction } from "@/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { fetchCustomerPurchaseHistory } from "@/services/transactions/customerDataService";
import { formatDate, formatCurrency } from "@/utils/format";
import { Store } from "lucide-react";

interface CustomerDetailViewProps {
  customer: Customer;
}

export default function CustomerDetailView({ customer }: CustomerDetailViewProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadPurchaseHistory = async () => {
      setIsLoading(true);
      try {
        const history = await fetchCustomerPurchaseHistory(customer.id);
        setTransactions(history);
      } catch (error) {
        console.error("Error loading purchase history:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (customer.id) {
      loadPurchaseHistory();
    }
  }, [customer.id]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <h3 className="font-medium">Customer Information</h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium">Name</p>
              <p className="text-muted-foreground">{customer.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Phone</p>
              <p className="text-muted-foreground">{customer.phone}</p>
            </div>
            {customer.email && (
              <div>
                <p className="text-sm font-medium">Email</p>
                <p className="text-muted-foreground">{customer.email}</p>
              </div>
            )}
            {customer.storeName && (
              <div>
                <p className="text-sm font-medium">Registered at</p>
                <p className="text-muted-foreground flex items-center">
                  <Store className="h-3 w-3 mr-1" /> {customer.storeName}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="purchases">
        <TabsList className="w-full">
          <TabsTrigger value="purchases" className="flex-1">Purchase History</TabsTrigger>
          <TabsTrigger value="loyalty" className="flex-1">Loyalty</TabsTrigger>
        </TabsList>
        
        <TabsContent value="purchases" className="mt-4">
          {isLoading ? (
            <p className="text-center py-4">Loading purchase history...</p>
          ) : transactions.length > 0 ? (
            <div className="space-y-3">
              {transactions.map((transaction) => (
                <Card key={transaction.id}>
                  <CardContent className="p-3">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">
                        Receipt #{transaction.receiptNumber}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(transaction.created_at || '')}
                      </span>
                    </div>
                    <div className="border-t pt-2 mt-1">
                      <div className="flex justify-between">
                        <span className="text-sm">Total</span>
                        <span className="text-sm font-medium">
                          {formatCurrency(transaction.total)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Items</span>
                        <span className="text-sm">
                          {Array.isArray(transaction.items) ? transaction.items.length : 0}
                        </span>
                      </div>
                    </div>
                    <div className="text-right mt-2">
                      <Button variant="outline" size="sm">View Details</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-center py-4 text-muted-foreground">No purchase history found</p>
          )}
        </TabsContent>
        
        <TabsContent value="loyalty" className="mt-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-center py-8 text-muted-foreground">
                Loyalty program features coming soon!
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
