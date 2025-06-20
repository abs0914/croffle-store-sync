
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Package, TrendingUp, DollarSign } from "lucide-react";
import { useAuth } from "@/contexts/auth";
import { 
  fetchCommissaryPurchases, 
  getLowStockCommissaryItems,
  fetchCommissaryItemsForPurchase 
} from "@/services/commissaryPurchases/commissaryPurchaseService";
import { CreateCommissaryPurchaseDialog } from "./CreateCommissaryPurchaseDialog";
import { formatCurrency } from "@/utils/format";
import type { CommissaryPurchase } from "@/types/commissaryPurchases";

export function CommissaryPurchasesTab() {
  const { user } = useAuth();
  const [purchases, setPurchases] = useState<CommissaryPurchase[]>([]);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [purchasesData, lowStockData] = await Promise.all([
        fetchCommissaryPurchases(100),
        getLowStockCommissaryItems()
      ]);
      
      setPurchases(purchasesData);
      setLowStockItems(lowStockData);
    } catch (error) {
      console.error('Error loading commissary purchases data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPurchases = purchases.filter(purchase =>
    purchase.commissary_item?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    purchase.supplier?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    purchase.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate summary stats
  const totalSpent = purchases.reduce((sum, p) => sum + p.total_cost, 0);
  const recentPurchases = purchases.filter(p => {
    const purchaseDate = new Date(p.purchase_date);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return purchaseDate >= thirtyDaysAgo;
  });

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <div className="text-sm text-muted-foreground">Total Spent (All Time)</div>
            </div>
            <div className="text-2xl font-bold">{formatCurrency(totalSpent)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <div className="text-sm text-muted-foreground">Recent Purchases (30d)</div>
            </div>
            <div className="text-2xl font-bold">{recentPurchases.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-orange-600" />
              <div className="text-sm text-muted-foreground">Low Stock Items</div>
            </div>
            <div className="text-2xl font-bold">{lowStockItems.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-600" />
              <div className="text-sm text-muted-foreground">Avg Purchase Value</div>
            </div>
            <div className="text-2xl font-bold">
              {purchases.length > 0 ? formatCurrency(totalSpent / purchases.length) : formatCurrency(0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <Package className="h-5 w-5" />
              Low Stock Alert
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-orange-700 mb-3">
              {lowStockItems.length} item{lowStockItems.length !== 1 ? 's' : ''} need restocking
            </p>
            <div className="flex flex-wrap gap-2">
              {lowStockItems.slice(0, 5).map(item => (
                <Badge key={item.id} variant="secondary" className="text-xs">
                  {item.name}: {item.current_stock}/{item.minimum_threshold} {item.unit}
                </Badge>
              ))}
              {lowStockItems.length > 5 && (
                <Badge variant="secondary" className="text-xs">
                  +{lowStockItems.length - 5} more
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Purchases List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Purchase History</CardTitle>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Record Purchase
            </Button>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search purchases..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-20 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          ) : filteredPurchases.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                No purchases found
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPurchases.map((purchase) => (
                <div key={purchase.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{purchase.commissary_item?.name}</h3>
                        <Badge variant="outline">{purchase.commissary_item?.category?.replace('_', ' ')}</Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Quantity:</span>
                          <span className="ml-2 font-medium">
                            {purchase.quantity_purchased} {purchase.commissary_item?.unit}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Unit Cost:</span>
                          <span className="ml-2 font-medium">{formatCurrency(purchase.unit_cost)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Total:</span>
                          <span className="ml-2 font-bold text-green-600">{formatCurrency(purchase.total_cost)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Supplier:</span>
                          <span className="ml-2">{purchase.supplier?.name || 'N/A'}</span>
                        </div>
                      </div>
                      
                      {purchase.batch_number && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Batch:</span>
                          <span className="ml-2">{purchase.batch_number}</span>
                        </div>
                      )}
                      
                      {purchase.invoice_number && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Invoice:</span>
                          <span className="ml-2">{purchase.invoice_number}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-xs text-muted-foreground">
                    Purchase Date: {new Date(purchase.purchase_date).toLocaleDateString()}
                    <span className="ml-4">
                      Recorded: {new Date(purchase.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CreateCommissaryPurchaseDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={loadData}
      />
    </div>
  );
}
