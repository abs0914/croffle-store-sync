
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Package, 
  Plus, 
  Search, 
  Download,
  Upload,
  AlertTriangle,
  Factory
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { CommissaryInventoryItem } from '@/types/commissary';

export const CommissaryInventoryTab: React.FC = () => {
  const [items, setItems] = useState<CommissaryInventoryItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<CommissaryInventoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCommissaryInventory();
  }, []);

  useEffect(() => {
    filterItems();
  }, [items, searchQuery]);

  const fetchCommissaryInventory = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('commissary_inventory')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error fetching commissary inventory:', error);
      toast.error('Failed to load commissary inventory');
    } finally {
      setIsLoading(false);
    }
  };

  const filterItems = () => {
    let filtered = items;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query) ||
        item.sku?.toLowerCase().includes(query)
      );
    }

    setFilteredItems(filtered);
  };

  const getStockStatus = (item: CommissaryInventoryItem) => {
    if (item.current_stock <= 0) return { status: 'out', label: 'Out of Stock', color: 'destructive' };
    if (item.current_stock <= item.minimum_threshold) return { status: 'low', label: 'Low Stock', color: 'warning' };
    return { status: 'good', label: 'In Stock', color: 'success' };
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'raw_materials': return 'bg-blue-100 text-blue-800';
      case 'packaging_materials': return 'bg-green-100 text-green-800';
      case 'supplies': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);
  };

  const lowStockItems = items.filter(item => 
    item.current_stock > 0 && item.current_stock <= item.minimum_threshold
  );
  const outOfStockItems = items.filter(item => item.current_stock <= 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Factory className="h-6 w-6" />
            Commissary Inventory
          </h2>
          <p className="text-muted-foreground">
            Manage raw materials and supplies for recipe production
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>
      </div>

      {/* Alert Cards */}
      {(lowStockItems.length > 0 || outOfStockItems.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {outOfStockItems.length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-red-800 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Out of Stock ({outOfStockItems.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {outOfStockItems.slice(0, 3).map(item => (
                    <p key={item.id} className="text-sm text-red-700">
                      {item.name}
                    </p>
                  ))}
                  {outOfStockItems.length > 3 && (
                    <p className="text-sm text-red-600">
                      +{outOfStockItems.length - 3} more items
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {lowStockItems.length > 0 && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-yellow-800 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Low Stock ({lowStockItems.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {lowStockItems.slice(0, 3).map(item => (
                    <p key={item.id} className="text-sm text-yellow-700">
                      {item.name} ({item.current_stock} {item.unit})
                    </p>
                  ))}
                  {lowStockItems.length > 3 && (
                    <p className="text-sm text-yellow-600">
                      +{lowStockItems.length - 3} more items
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search commissary items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Inventory Grid */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading commissary inventory...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No Items Found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery 
                ? 'No items match your search criteria.'
                : 'Get started by adding commissary inventory items.'
              }
            </p>
            {!searchQuery && (
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add First Item
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map(item => {
            const stockStatus = getStockStatus(item);
            return (
              <Card key={item.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{item.name}</h3>
                      {item.sku && (
                        <p className="text-sm text-muted-foreground">SKU: {item.sku}</p>
                      )}
                    </div>
                    <Badge 
                      variant={stockStatus.color as any}
                      className="ml-2"
                    >
                      {stockStatus.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Category</span>
                    <Badge className={getCategoryColor(item.category)}>
                      {item.category.replace('_', ' ')}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Stock</span>
                    <span className="font-medium">
                      {item.current_stock} {item.unit}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Min. Threshold</span>
                    <span className="text-sm">
                      {item.minimum_threshold} {item.unit}
                    </span>
                  </div>

                  {item.unit_cost && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Unit Cost</span>
                      <span className="text-sm font-medium">
                        {formatCurrency(item.unit_cost)}
                      </span>
                    </div>
                  )}

                  {item.storage_location && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Location</span>
                      <span className="text-sm">{item.storage_location}</span>
                    </div>
                  )}

                  <div className="pt-2 border-t">
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        Edit
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1">
                        Adjust Stock
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
