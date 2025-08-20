import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Trash2, Plus } from 'lucide-react';
import { cleanupSugboMercadoCatalog } from '@/services/productCatalog/catalogCleanupService';

export const CatalogCleanupTool: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);

  const handleCleanup = async () => {
    setIsLoading(true);
    try {
      const result = await cleanupSugboMercadoCatalog();
      setLastResult(result);
    } catch (error) {
      console.error('Cleanup failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          Sugbo Mercado Catalog Cleanup
        </CardTitle>
        <CardDescription>
          Clean up duplicate croffle products and add missing add-on items for Sugbo Mercado (IT Park, Cebu)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-medium text-destructive mb-2 flex items-center gap-1">
              <Trash2 className="h-4 w-4" />
              Will Delete Duplicates:
            </h4>
            <ul className="space-y-1 text-muted-foreground">
              <li>• Choco Overload (keep Choco Overload Croffle)</li>
              <li>• Biscoff (keep Biscoff Croffle)</li>
              <li>• Cookies & Cream (keep Cookies & Cream Croffle)</li>
              <li>• Strawberry, Blueberry, Mango (keep Croffle versions)</li>
              <li>• Choco Nut, Choco Marshmallow (keep Croffle versions)</li>
              <li>• Duplicate add-on items (Tiramisu, Dark Chocolate, etc.)</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-green-600 mb-2 flex items-center gap-1">
              <Plus className="h-4 w-4" />
              Will Add Missing Items:
            </h4>
            <ul className="space-y-1 text-muted-foreground">
              <li>• Caramel Sauce (₱6.00)</li>
              <li>• Chocolate Crumbs (₱6.00)</li>
            </ul>
          </div>
        </div>

        {lastResult && (
          <div className="p-3 bg-muted rounded-md">
            <p className="text-sm">
              <strong>Last Result:</strong> Deleted {lastResult.deleted} items, 
              added {lastResult.added} items
              {lastResult.errors.length > 0 && (
                <span className="text-destructive"> ({lastResult.errors.length} errors)</span>
              )}
            </p>
          </div>
        )}

        <Button 
          onClick={handleCleanup}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? 'Cleaning up...' : 'Execute Cleanup'}
        </Button>
      </CardContent>
    </Card>
  );
};