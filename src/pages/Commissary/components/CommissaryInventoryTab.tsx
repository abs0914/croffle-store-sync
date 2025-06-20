
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Package, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/utils/format";

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
  const [items, setItems] = useState<CommissaryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('commissary_inventory')
        .select(`
          *,
          supplier:suppliers(name)
        `)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      
      // Transform the data to match our interface
      const transformedData = (data || []).map(item => ({
        ...item,
        supplier: Array.isArray(item.supplier) && item.supplier.length > 0 
          ? item.supplier[0] 
          : item.supplier || undefined
      }));
      
      setItems(transformedData);
    } catch (error) {
      console.error('Error loading commissary items:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const lowStockItems = items.filter(item => item.current_stock <= item.minimum_threshold);

  return (
    <div className="space-y-6">
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
              {formatCurrency(items.reduce((sum, item) => sum + (item.current_stock * item.unit_cost), 0))}
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
            <Input
              placeholder="Search items..."
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
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No items found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredItems.map((item) => (
                <div key={item.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{item.name}</h3>
                        <Badge variant="outline">{item.category.replace('_', ' ')}</Badge>
                        {item.current_stock <= item.minimum_threshold && (
                          <Badge variant="destructive">Low Stock</Badge>
                        )}
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
                      
                      {item.supplier && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Supplier:</span>
                          <span className="ml-2">{item.supplier.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
