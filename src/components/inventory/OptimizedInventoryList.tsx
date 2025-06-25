
import React, { useState, useMemo, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Search, Package, AlertTriangle, TrendingUp, Loader2 } from 'lucide-react';
import { useOptimizedInventory } from '@/hooks/inventory/useOptimizedInventory';
import { useStore } from '@/contexts/StoreContext';
import { InventoryItem } from '@/types/inventoryManagement';

interface OptimizedInventoryListProps {
  onItemSelect?: (item: InventoryItem) => void;
}

const ITEM_HEIGHT = 80;
const VISIBLE_ITEMS = 8;
const LIST_WIDTH = '100%';

export function OptimizedInventoryList({ onItemSelect }: OptimizedInventoryListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const { currentStore } = useStore();

  const {
    inventoryItems,
    isLoading,
    error,
    computedStats,
    createOptimizedFilter,
    activeStoreId
  } = useOptimizedInventory();

  // Memoized filtered items
  const filteredItems = useMemo(() => {
    return createOptimizedFilter(searchTerm, selectedCategory);
  }, [createOptimizedFilter, searchTerm, selectedCategory]);

  // Memoized categories
  const categories = useMemo(() => {
    const uniqueCategories = new Set(inventoryItems.map(item => item.category));
    return Array.from(uniqueCategories).filter(Boolean);
  }, [inventoryItems]);

  // Optimized row renderer for virtualization
  const RowRenderer = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const item = filteredItems[index];
    if (!item) return null;

    const isLowStock = item.current_stock <= (item.minimum_threshold || 10);
    const isOutOfStock = item.current_stock <= 0;

    return (
      <div style={style}>
        <Card 
          className={`mx-2 my-1 cursor-pointer transition-colors hover:bg-accent ${
            isOutOfStock ? 'border-red-200 bg-red-50' : 
            isLowStock ? 'border-amber-200 bg-amber-50' : ''
          }`}
          onClick={() => onItemSelect?.(item)}
        >
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-sm">{item.name}</h4>
                  {isOutOfStock && (
                    <Badge variant="destructive" className="text-xs">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Out of Stock
                    </Badge>
                  )}
                  {isLowStock && !isOutOfStock && (
                    <Badge variant="secondary" className="text-xs">
                      Low Stock
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                  <span>Stock: {item.current_stock} {item.unit}</span>
                  <span>Min: {item.minimum_threshold || 10}</span>
                  {item.unit_cost && (
                    <span>Cost: ₱{item.unit_cost.toFixed(2)}</span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">
                  ₱{((item.current_stock || 0) * (item.unit_cost || 0)).toFixed(2)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {item.category}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }, [filteredItems, onItemSelect]);

  // Show store selection message if no store is selected
  if (!currentStore) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Please select a store to view inventory items.
        </AlertDescription>
      </Alert>
    );
  }

  // Show error if there's an issue fetching data
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Error loading inventory: {error instanceof Error ? error.message : 'Unknown error'}
        </AlertDescription>
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin" />
          <p>Loading inventory...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Performance Stats */}
      {computedStats && (
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-blue-600">{computedStats.totalItems}</div>
              <div className="text-xs text-muted-foreground">Total Items</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-green-600">{computedStats.healthyItems}</div>
              <div className="text-xs text-muted-foreground">Healthy Stock</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-amber-600">{computedStats.lowStockItems}</div>
              <div className="text-xs text-muted-foreground">Low Stock</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-red-600">{computedStats.outOfStockItems}</div>
              <div className="text-xs text-muted-foreground">Out of Stock</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Store Information */}
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Package className="h-4 w-4" />
            <span>Store: {currentStore.name}</span>
            <span>•</span>
            <span>ID: {activeStoreId}</span>
          </div>
        </CardContent>
      </Card>

      {/* Search and Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Inventory Items ({filteredItems.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search inventory..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border rounded-md bg-background"
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          {/* Virtualized List */}
          {filteredItems.length > 0 ? (
            <List
              height={ITEM_HEIGHT * Math.min(VISIBLE_ITEMS, filteredItems.length)}
              itemCount={filteredItems.length}
              itemSize={ITEM_HEIGHT}
              width={LIST_WIDTH}
              className="border rounded-md"
            >
              {RowRenderer}
            </List>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-8 w-8 mx-auto mb-2" />
              <p>No inventory items found</p>
              {searchTerm && (
                <p className="text-xs mt-1">Try adjusting your search terms</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
