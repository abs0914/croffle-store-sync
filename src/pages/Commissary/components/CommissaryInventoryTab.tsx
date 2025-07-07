import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Package, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/utils/format";
import { useAuth } from "@/contexts/auth";
import { toast } from "sonner";
interface CommissaryItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  current_stock: number;
  minimum_threshold: number;
  unit_cost: number;
  last_purchase_date?: string;
  supplier?: {
    name: string;
  };
}
export function CommissaryInventoryTab() {
  const {
    user,
    hasPermission
  } = useAuth();
  const [items, setItems] = useState<CommissaryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Check if user has appropriate permissions
  const hasCommissaryAccess = hasPermission('admin') || hasPermission('owner') || hasPermission('manager');
  useEffect(() => {
    console.log('CommissaryInventoryTab: Current user:', user);
    console.log('CommissaryInventoryTab: Has commissary access:', hasCommissaryAccess);
    if (!user) {
      setError('Please log in to access commissary inventory');
      setLoading(false);
      return;
    }
    if (!hasCommissaryAccess) {
      setError('Access denied. Commissary inventory is only available to administrators, owners, and managers.');
      setLoading(false);
      return;
    }
    loadItems();
  }, [user, hasCommissaryAccess]);
  const loadItems = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('CommissaryInventoryTab: Loading commissary items...');

      // First, let's try a simple query without joins to avoid the relationship error
      const {
        data,
        error
      } = await supabase.from('commissary_inventory').select('*').eq('is_active', true).order('name');
      if (error) {
        console.error('CommissaryInventoryTab: Database error:', error);
        throw error;
      }
      console.log('CommissaryInventoryTab: Raw data from database:', data);
      console.log('CommissaryInventoryTab: Found items count:', data?.length || 0);

      // Transform the data to match our interface
      const transformedData: CommissaryItem[] = (data || []).map(item => ({
        id: item.id,
        name: item.name,
        category: item.category,
        unit: item.unit,
        current_stock: item.current_stock,
        minimum_threshold: item.minimum_threshold,
        unit_cost: item.unit_cost || 0,
        last_purchase_date: item.last_purchase_date,
        // We'll load supplier info separately if needed
        supplier: undefined
      }));
      console.log('CommissaryInventoryTab: Transformed data:', transformedData);
      setItems(transformedData);
      if (transformedData.length === 0) {
        console.log('CommissaryInventoryTab: No items found - checking if any items exist at all');

        // Debug query to check if any items exist regardless of filters
        const {
          data: allItems,
          error: debugError
        } = await supabase.from('commissary_inventory').select('id, name, is_active').limit(5);
        if (!debugError && allItems) {
          console.log('CommissaryInventoryTab: Debug - Sample items in database:', allItems);
          const activeCount = allItems.filter(item => item.is_active).length;
          const inactiveCount = allItems.filter(item => !item.is_active).length;
          console.log('CommissaryInventoryTab: Debug - Active items:', activeCount, 'Inactive items:', inactiveCount);
          if (allItems.length > 0 && activeCount === 0) {
            setError('No active commissary items found. All items may be marked as inactive.');
          }
        }
      }
    } catch (error: any) {
      console.error('CommissaryInventoryTab: Error loading commissary items:', error);
      setError(`Failed to load commissary inventory: ${error.message || 'Database connection error'}`);
      toast.error('Failed to load commissary inventory');
    } finally {
      setLoading(false);
    }
  };
  const filteredItems = items.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()) || item.category.toLowerCase().includes(searchTerm.toLowerCase()));
  const lowStockItems = items.filter(item => item.current_stock <= item.minimum_threshold);

  // Show authentication error
  if (!user) {
    return <div className="space-y-6">
        <Card>
          <CardContent className="p-8 text-center">
            <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-orange-600" />
            <h2 className="text-2xl font-semibold mb-2">Authentication Required</h2>
            <p className="text-muted-foreground mb-4">
              Please log in to access the commissary inventory.
            </p>
            <Button onClick={() => window.location.href = '/auth'}>
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>;
  }

  // Show permission error
  if (!hasCommissaryAccess) {
    return <div className="space-y-6">
        <Card>
          <CardContent className="p-8 text-center">
            <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-semibold mb-2">Access Restricted</h2>
            <p className="text-muted-foreground mb-4">
              Commissary inventory management is only available to administrators, owners, and managers.
            </p>
            <p className="text-sm text-muted-foreground">
              Current role: {user?.role || 'Unknown'}
            </p>
          </CardContent>
        </Card>
      </div>;
  }
  return <div className="space-y-6">
      {/* Debug Information (temporary) */}
      {process.env.NODE_ENV === 'development' && <Card className="border-yellow-200 bg-yellow-50">
          
        </Card>}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-blue-600" />
              <div className="text-sm text-muted-foreground">Total Items</div>
            </div>
            <div className="text-2xl font-bold">{items.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <div className="text-sm text-muted-foreground">Low Stock</div>
            </div>
            <div className="text-2xl font-bold">{lowStockItems.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-green-600" />
              <div className="text-sm text-muted-foreground">Total Value</div>
            </div>
            <div className="text-2xl font-bold">
              {formatCurrency(items.reduce((sum, item) => sum + item.current_stock * item.unit_cost, 0))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-purple-600" />
              <div className="text-sm text-muted-foreground">Categories</div>
            </div>
            <div className="text-2xl font-bold">
              {new Set(items.map(item => item.category)).size}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Inventory List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Commissary Inventory</CardTitle>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search items..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
          </div>
        </CardHeader>
        
        <CardContent>
          {loading ? <div className="space-y-4">
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                <p className="mt-2 text-muted-foreground">Loading commissary inventory...</p>
              </div>
            </div> : error ? <div className="text-center py-8">
              <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-red-600" />
              <h3 className="text-lg font-semibold mb-2">Error Loading Data</h3>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={loadItems} variant="outline">
                Try Again
              </Button>
            </div> : filteredItems.length === 0 ? <div className="text-center py-8">
              <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">
                {searchTerm ? 'No items found' : 'No commissary items'}
              </h3>
              <p className="text-muted-foreground">
                {searchTerm ? 'Try adjusting your search terms' : 'No commissary inventory items have been added yet'}
              </p>
              {!searchTerm && <Button className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Item
                </Button>}
            </div> : <div className="space-y-4">
              {filteredItems.map(item => <div key={item.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{item.name}</h3>
                        <Badge variant="outline">{item.category.replace('_', ' ')}</Badge>
                        {item.current_stock <= item.minimum_threshold && <Badge variant="destructive">Low Stock</Badge>}
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Stock:</span>
                          <span className="ml-2 font-medium">
                            {item.current_stock} {item.unit}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Min Threshold:</span>
                          <span className="ml-2 font-medium">
                            {item.minimum_threshold} {item.unit}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Unit Cost:</span>
                          <span className="ml-2 font-medium">{formatCurrency(item.unit_cost)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Total Value:</span>
                          <span className="ml-2 font-bold text-green-600">
                            {formatCurrency(item.current_stock * item.unit_cost)}
                          </span>
                        </div>
                      </div>
                      
                      {item.supplier && <div className="text-sm">
                          <span className="text-muted-foreground">Supplier:</span>
                          <span className="ml-2">{item.supplier.name}</span>
                        </div>}
                    </div>
                  </div>
                </div>)}
            </div>}
        </CardContent>
      </Card>
    </div>;
}