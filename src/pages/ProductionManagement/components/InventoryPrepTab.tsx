
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Package, AlertTriangle, CheckCircle, Search, Filter } from "lucide-react";
import { CommissaryInventoryItem } from "@/types/inventoryManagement";
import { fetchCommissaryInventory } from "@/services/inventoryManagement/commissaryInventoryService";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function InventoryPrepTab() {
  const [items, setItems] = useState<CommissaryInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    setLoading(true);
    const data = await fetchCommissaryInventory();
    setItems(data);
    setLoading(false);
  };

  const getStockStatus = (item: CommissaryInventoryItem) => {
    if (item.current_stock === 0) return 'out';
    if (item.current_stock <= item.minimum_threshold) return 'low';
    return 'good';
  };

  const getStockBadge = (item: CommissaryInventoryItem) => {
    const status = getStockStatus(item);
    const variants = {
      good: { variant: 'default', className: 'bg-green-100 text-green-800', text: 'Good Stock' },
      low: { variant: 'secondary', className: 'bg-yellow-100 text-yellow-800', text: 'Low Stock' },
      out: { variant: 'destructive', className: '', text: 'Out of Stock' }
    } as const;

    const config = variants[status];
    return (
      <Badge variant={config.variant} className={config.className}>
        {status === 'good' && <CheckCircle className="h-3 w-3 mr-1" />}
        {status === 'low' && <AlertTriangle className="h-3 w-3 mr-1" />}
        {status === 'out' && <Package className="h-3 w-3 mr-1" />}
        {config.text}
      </Badge>
    );
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.category.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    
    const matchesStock = stockFilter === 'all' || getStockStatus(item) === stockFilter;
    
    return matchesSearch && matchesCategory && matchesStock;
  });

  const stockStats = {
    total: items.length,
    good: items.filter(item => getStockStatus(item) === 'good').length,
    low: items.filter(item => getStockStatus(item) === 'low').length,
    out: items.filter(item => getStockStatus(item) === 'out').length
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-24 bg-gray-200 rounded-lg"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Summary */}
      <div>
        <h2 className="text-2xl font-bold mb-2">Inventory Preparation</h2>
        <p className="text-muted-foreground mb-4">
          Monitor commissary inventory levels and prepare for production needs
        </p>
        
        {/* Stock Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stockStats.total}</div>
                <div className="text-sm text-muted-foreground">Total Items</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stockStats.good}</div>
                <div className="text-sm text-muted-foreground">Good Stock</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{stockStats.low}</div>
                <div className="text-sm text-muted-foreground">Low Stock</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{stockStats.out}</div>
                <div className="text-sm text-muted-foreground">Out of Stock</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Alerts */}
      {stockStats.low > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {stockStats.low} item{stockStats.low !== 1 ? 's' : ''} {stockStats.low !== 1 ? 'are' : 'is'} running low on stock. 
            Consider restocking before production.
          </AlertDescription>
        </Alert>
      )}

      {stockStats.out > 0 && (
        <Alert variant="destructive">
          <Package className="h-4 w-4" />
          <AlertDescription>
            {stockStats.out} item{stockStats.out !== 1 ? 's' : ''} {stockStats.out !== 1 ? 'are' : 'is'} out of stock. 
            These items need immediate restocking.
          </AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="raw_materials">Raw Materials</SelectItem>
                <SelectItem value="packaging_materials">Packaging Materials</SelectItem>
                <SelectItem value="supplies">Supplies</SelectItem>
              </SelectContent>
            </Select>

            <Select value={stockFilter} onValueChange={setStockFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Stock Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stock Levels</SelectItem>
                <SelectItem value="good">Good Stock</SelectItem>
                <SelectItem value="low">Low Stock</SelectItem>
                <SelectItem value="out">Out of Stock</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Items */}
      <Card>
        <CardHeader>
          <CardTitle>Commissary Inventory ({filteredItems.length} items)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-medium">{item.name}</h3>
                    {getStockBadge(item)}
                    <Badge variant="outline">
                      {item.category.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                    <div>
                      <span className="font-medium">Current:</span> {item.current_stock} {item.uom}
                    </div>
                    <div>
                      <span className="font-medium">Min Threshold:</span> {item.minimum_threshold} {item.uom}
                    </div>
                    <div>
                      <span className="font-medium">Unit Cost:</span> ₱{(item.unit_cost || 0).toFixed(2)}
                    </div>
                    <div>
                      <span className="font-medium">Total Value:</span> ₱{((item.current_stock * (item.unit_cost || 0)).toFixed(2))}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                  {getStockStatus(item) !== 'good' && (
                    <Button variant="outline" size="sm" className="text-orange-600 hover:text-orange-700">
                      Request Restock
                    </Button>
                  )}
                </div>
              </div>
            ))}
            
            {filteredItems.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No items found matching your search criteria.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button onClick={loadItems} variant="outline">
          Refresh Data
        </Button>
        <Button variant="outline">
          Export Report
        </Button>
        <Button variant="outline">
          Generate Purchase Orders
        </Button>
      </div>
    </div>
  );
}
