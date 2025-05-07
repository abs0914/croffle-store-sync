
import { useState, useEffect } from "react";
import { useStore } from "@/contexts/StoreContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { fetchInventoryTransactions, fetchProducts } from "@/services/inventoryService";
import { Product } from "@/types";
import { toast } from "sonner";
import { format } from "date-fns";

export default function InventoryTransactions() {
  const { currentStore } = useStore();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const loadTransactions = async (reset = false) => {
    if (!currentStore) return;
    
    try {
      const newOffset = reset ? 0 : offset;
      setIsLoading(reset);
      setIsLoadingMore(!reset);
      
      const data = await fetchInventoryTransactions(
        currentStore.id, 
        selectedProductId || undefined,
        limit,
        newOffset
      );
      
      if (data.length < limit) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }
      
      setTransactions(prev => reset ? data : [...prev, ...data]);
      
      if (reset) {
        setOffset(limit);
      } else {
        setOffset(prev => prev + limit);
      }
    } catch (error) {
      console.error("Error loading inventory transactions:", error);
      toast.error("Failed to load inventory history");
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const loadProducts = async () => {
    if (!currentStore) return;
    
    try {
      const data = await fetchProducts(currentStore.id);
      setProducts(data);
    } catch (error) {
      console.error("Error loading products:", error);
    }
  };

  // Load initial data
  useEffect(() => {
    if (currentStore) {
      loadProducts();
      loadTransactions(true);
    }
  }, [currentStore]);
  
  // Reload when product filter changes
  useEffect(() => {
    loadTransactions(true);
  }, [selectedProductId]);

  // Filter transactions based on search
  const filteredTransactions = searchQuery ? 
    transactions.filter(tx => 
      (tx.products?.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tx.product_variations?.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tx.reason || "").toLowerCase().includes(searchQuery.toLowerCase())
    ) : 
    transactions;

  const handleProductChange = (value: string) => {
    setSelectedProductId(value);
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy h:mm a');
    } catch (e) {
      return dateString;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Inventory Transactions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search transactions..."
              className="pl-8 border-croffle-primary/30 focus-visible:ring-croffle-accent"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <Select 
            value={selectedProductId} 
            onValueChange={handleProductChange}
          >
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="All Products" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Products</SelectItem>
              {products.map(product => (
                <SelectItem key={product.id} value={product.id}>
                  {product.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button 
            variant="outline" 
            className="flex items-center"
            onClick={() => loadTransactions(true)}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Spinner size="lg" />
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="text-center py-8">
            <h3 className="mt-4 text-lg font-medium">No transactions found</h3>
            <p className="text-muted-foreground mt-2">
              {searchQuery || selectedProductId ? 
                "Try changing your search query or filters" : 
                "No inventory transactions recorded yet"
              }
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-hidden rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Variation</TableHead>
                    <TableHead>Change</TableHead>
                    <TableHead>New Qty</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell>{formatDate(tx.created_at)}</TableCell>
                      <TableCell>{tx.products?.name || "-"}</TableCell>
                      <TableCell>{tx.product_variations?.name || "-"}</TableCell>
                      <TableCell className={`font-semibold ${tx.quantity_change > 0 ? 'text-green-600' : tx.quantity_change < 0 ? 'text-red-600' : ''}`}>
                        {tx.quantity_change > 0 ? `+${tx.quantity_change}` : tx.quantity_change}
                      </TableCell>
                      <TableCell>{tx.new_quantity}</TableCell>
                      <TableCell>{tx.reason || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            {hasMore && (
              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={() => loadTransactions(false)}
                disabled={isLoadingMore}
              >
                {isLoadingMore ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    Loading...
                  </>
                ) : (
                  "Load More"
                )}
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
