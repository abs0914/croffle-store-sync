
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Package, Plus, Search } from 'lucide-react';
import { fetchInventoryStock } from '@/services/inventoryManagement/recipeService';
import { InventoryStock } from '@/types/inventoryManagement';
import { toast } from 'sonner';

interface InventoryItemsListProps {
  storeId: string;
}

export function InventoryItemsList({ storeId }: InventoryItemsListProps) {
  const [inventoryItems, setInventoryItems] = useState<InventoryStock[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadInventoryItems();
  }, [storeId]);

  const loadInventoryItems = async () => {
    setIsLoading(true);
    try {
      const data = await fetchInventoryStock(storeId);
      // Ensure cost property is defined for all items
      const itemsWithCost = data.map(item => ({
        ...item,
        cost: item.cost ?? 0
      }));
      setInventoryItems(itemsWithCost);
    } catch (error) {
      console.error('Error loading inventory items:', error);
      toast.error('Failed to load inventory items');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredItems = inventoryItems.filter(item =>
    item.item.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStockLevelColor = (quantity: number) => {
    if (quantity === 0) return 'bg-red-100 text-red-800';
    if (quantity < 10) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const getStockLevelText = (quantity: number) => {
    if (quantity === 0) return 'Out of Stock';
    if (quantity < 10) return 'Low Stock';
    return 'In Stock';
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Store Inventory</h2>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search inventory items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map((item) => (
          <Card key={item.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {item.item}
              </CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Stock Quantity:</span>
                  <span className="font-medium">{item.stock_quantity} {item.unit}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Cost per Unit:</span>
                  <span className="font-medium">₱{item.cost?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <Badge className={getStockLevelColor(item.stock_quantity)}>
                    {getStockLevelText(item.stock_quantity)}
                  </Badge>
                </div>
                {item.sku && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">SKU:</span>
                    <span className="text-sm">{item.sku}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No inventory items found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery 
                ? 'No items match your search criteria.'
                : 'No inventory items have been added yet.'
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
