/**
 * POS Debug Panel - Shows real-time data loading status
 */

import { useState, useEffect } from 'react';
import { useStore } from '@/contexts/StoreContext';
import { useUnifiedProducts } from '@/hooks/unified/useUnifiedProducts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Database, Store, Package } from 'lucide-react';

export function POSDebugPanel() {
  const { currentStore, stores } = useStore();
  const [isVisible, setIsVisible] = useState(false);
  
  const {
    products,
    allProducts,
    categories,
    isLoading,
    error,
    isConnected,
    totalProducts,
    availableProducts,
    refresh
  } = useUnifiedProducts({
    storeId: currentStore?.id || null,
    autoRefresh: true
  });

  // Show debug panel when there are issues
  useEffect(() => {
    const hasIssues = !!error || !isConnected || (totalProducts === 0 && !isLoading);
    setIsVisible(hasIssues);
  }, [error, isConnected, totalProducts, isLoading]);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      <Card className="border-orange-200 bg-orange-50 shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-orange-800">
              POS Debug Panel
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsVisible(false)}
              className="h-6 w-6 p-0 text-orange-600"
            >
              ×
            </Button>
          </div>
          <CardDescription className="text-xs text-orange-600">
            Product loading diagnostics
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-3 text-xs">
          {/* Store Info */}
          <div className="flex items-center gap-2">
            <Store className="h-3 w-3 text-orange-600" />
            <span className="font-medium">Store:</span>
            <Badge variant={currentStore ? "default" : "destructive"} className="text-xs">
              {currentStore?.name || 'No store selected'}
            </Badge>
          </div>

          {/* Connection Status */}
          <div className="flex items-center gap-2">
            <Database className="h-3 w-3 text-orange-600" />
            <span className="font-medium">Connection:</span>
            <Badge variant={isConnected ? "default" : "destructive"} className="text-xs">
              {isConnected ? 'Connected' : 'Disconnected'}
            </Badge>
          </div>

          {/* Loading Status */}
          <div className="flex items-center gap-2">
            <RefreshCw className={`h-3 w-3 text-orange-600 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="font-medium">Status:</span>
            <Badge variant={isLoading ? "secondary" : "default"} className="text-xs">
              {isLoading ? 'Loading...' : 'Ready'}
            </Badge>
          </div>

          {/* Product Counts */}
          <div className="flex items-center gap-2">
            <Package className="h-3 w-3 text-orange-600" />
            <span className="font-medium">Products:</span>
            <div className="flex gap-1">
              <Badge variant="outline" className="text-xs">
                Total: {totalProducts}
              </Badge>
              <Badge variant="outline" className="text-xs">
                Available: {availableProducts}
              </Badge>
              <Badge variant="outline" className="text-xs">
                Loaded: {products.length}
              </Badge>
            </div>
          </div>

          {/* Categories */}
          <div className="flex items-center gap-2">
            <span className="font-medium">Categories:</span>
            <Badge variant="outline" className="text-xs">
              {categories.length} found
            </Badge>
          </div>

          {/* Error Display */}
          {error && (
            <div className="rounded bg-red-50 p-2 text-red-700">
              <div className="font-medium">Error:</div>
              <div className="text-xs">{error}</div>
            </div>
          )}

          {/* Issues Detection */}
          {totalProducts === 0 && !isLoading && (
            <div className="rounded bg-yellow-50 p-2 text-yellow-700">
              <div className="font-medium">⚠️ No products found</div>
              <div className="text-xs">
                This could indicate a data sync issue or empty catalog.
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={refresh}
              disabled={isLoading}
              className="text-xs"
            >
              {isLoading ? <RefreshCw className="h-3 w-3 animate-spin" /> : 'Refresh'}
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.location.reload()}
              className="text-xs"
            >
              Reload Page
            </Button>
          </div>

          {/* Quick Stats */}
          <div className="rounded bg-gray-50 p-2 text-xs text-gray-600">
            <div>Store ID: {currentStore?.id?.slice(0, 8)}...</div>
            <div>Categories: {categories.map(c => c.name).join(', ')}</div>
            <div>Sample Products: {products.slice(0, 3).map(p => p.name).join(', ')}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}