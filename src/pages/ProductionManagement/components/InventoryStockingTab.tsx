import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Package, TrendingUp, ShoppingCart, AlertTriangle } from "lucide-react";
import { 
  fetchCommissaryPurchases,
  createCommissaryPurchase,
  fetchCommissaryItemsForPurchase,
  fetchSuppliers
} from "@/services/commissaryPurchases/commissaryPurchaseService";
import type { CommissaryPurchase, CommissaryPurchaseForm } from "@/types/commissaryPurchases";
import { useAuth } from "@/contexts/auth";
import { toast } from "sonner";
import { QuickSupplierAdd } from "./QuickSupplierAdd";

export function InventoryStockingTab() {
  const { user } = useAuth();
  const [recentPurchases, setRecentPurchases] = useState<CommissaryPurchase[]>([]);
  const [commissaryItems, setCommissaryItems] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [purchaseForm, setPurchaseForm] = useState<CommissaryPurchaseForm>({
    commissary_item_id: '',
    supplier_id: '',
    purchase_date: new Date().toISOString().split('T')[0],
    quantity_purchased: 0,
    unit_cost: 0,
    batch_number: '',
    expiry_date: '',
    invoice_number: '',
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [purchases, items, suppliersData] = await Promise.all([
        fetchCommissaryPurchases(10),
        fetchCommissaryItemsForPurchase(),
        fetchSuppliers()
      ]);
      
      setRecentPurchases(purchases);
      setCommissaryItems(items);
      setSuppliers(suppliersData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load stocking data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!user?.id) {
      toast.error('Authentication required');
      return;
    }

    if (!purchaseForm.commissary_item_id || !purchaseForm.quantity_purchased || !purchaseForm.unit_cost) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      const success = await createCommissaryPurchase(purchaseForm, user.id);
      
      if (success) {
        // Reset form
        setPurchaseForm({
          commissary_item_id: '',
          supplier_id: '',
          purchase_date: new Date().toISOString().split('T')[0],
          quantity_purchased: 0,
          unit_cost: 0,
          batch_number: '',
          expiry_date: '',
          invoice_number: '',
          notes: ''
        });
        
        // Reload data
        await loadData();
      }
    } catch (error) {
      console.error('Error submitting purchase:', error);
      toast.error('Failed to record purchase');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedItem = commissaryItems.find(item => item.id === purchaseForm.commissary_item_id);
  const totalCost = purchaseForm.quantity_purchased * purchaseForm.unit_cost;

  // Calculate metrics
  const todaysPurchases = recentPurchases.filter(
    p => p.purchase_date === new Date().toISOString().split('T')[0]
  );
  const todaysTotal = todaysPurchases.reduce((sum, p) => sum + p.total_cost, 0);
  const lowStockItems = commissaryItems.filter(
    item => item.current_stock <= (item.minimum_threshold || 0)
  );

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Purchases</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todaysPurchases.length}</div>
            <p className="text-xs text-muted-foreground">
              Items purchased today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Total</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₱{todaysTotal.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Total purchase value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{lowStockItems.length}</div>
            <p className="text-xs text-muted-foreground">
              Need reordering
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{commissaryItems.length}</div>
            <p className="text-xs text-muted-foreground">
              Commissary items
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Purchase Recording Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Record Purchase
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Add supplier purchases to commissary inventory
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Item *</Label>
                <Select 
                  value={purchaseForm.commissary_item_id}
                  onValueChange={(value) => setPurchaseForm(prev => ({ ...prev, commissary_item_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select item" />
                  </SelectTrigger>
                  <SelectContent>
                    {commissaryItems.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name} ({item.current_stock} {item.unit})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Supplier</Label>
                <Select 
                  value={purchaseForm.supplier_id}
                  onValueChange={(value) => setPurchaseForm(prev => ({ ...prev, supplier_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {selectedItem && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  Current stock: {selectedItem.current_stock} {selectedItem.unit}
                </p>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Quantity *</Label>
                <Input
                  type="number"
                  value={purchaseForm.quantity_purchased}
                  onChange={(e) => setPurchaseForm(prev => ({ ...prev, quantity_purchased: Number(e.target.value) }))}
                  placeholder="0"
                  min="0"
                  step="0.1"
                />
              </div>
              <div className="space-y-2">
                <Label>Unit Cost *</Label>
                <Input
                  type="number"
                  value={purchaseForm.unit_cost}
                  onChange={(e) => setPurchaseForm(prev => ({ ...prev, unit_cost: Number(e.target.value) }))}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="space-y-2">
                <Label>Total Cost</Label>
                <Input
                  type="text"
                  value={`₱${totalCost.toFixed(2)}`}
                  disabled
                  className="bg-gray-50"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Purchase Date</Label>
                <Input
                  type="date"
                  value={purchaseForm.purchase_date}
                  onChange={(e) => setPurchaseForm(prev => ({ ...prev, purchase_date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Expiry Date</Label>
                <Input
                  type="date"
                  value={purchaseForm.expiry_date}
                  onChange={(e) => setPurchaseForm(prev => ({ ...prev, expiry_date: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Batch Number</Label>
                <Input
                  value={purchaseForm.batch_number}
                  onChange={(e) => setPurchaseForm(prev => ({ ...prev, batch_number: e.target.value }))}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2">
                <Label>Invoice Number</Label>
                <Input
                  value={purchaseForm.invoice_number}
                  onChange={(e) => setPurchaseForm(prev => ({ ...prev, invoice_number: e.target.value }))}
                  placeholder="Optional"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={purchaseForm.notes}
                onChange={(e) => setPurchaseForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes..."
                rows={2}
              />
            </div>

            <Button 
              onClick={handleSubmit}
              disabled={submitting || !purchaseForm.commissary_item_id || !purchaseForm.quantity_purchased || !purchaseForm.unit_cost}
              className="w-full"
            >
              {submitting ? (
                <>Recording...</>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Record Purchase
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Recent Purchases */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Recent Purchases
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Latest inventory purchases
            </p>
          </CardHeader>
          <CardContent>
            {recentPurchases.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No purchases recorded yet</p>
                <p className="text-sm text-muted-foreground">
                  Start by recording your first purchase
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentPurchases.map((purchase) => (
                  <div key={purchase.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">
                        {purchase.commissary_item?.name || 'Unknown Item'}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {new Date(purchase.purchase_date).toLocaleDateString()} • 
                        {purchase.quantity_purchased} {purchase.commissary_item?.unit} • 
                        ₱{purchase.total_cost.toFixed(2)}
                      </p>
                      {purchase.supplier?.name && (
                        <p className="text-xs text-blue-600">
                          from {purchase.supplier.name}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      Recorded
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
