
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Search, Package, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface CommissaryItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  unit_cost: number;
  current_stock: number;
  minimum_threshold: number;
}

interface RecipeIntegration {
  recipeId: string;
  recipeName: string;
  totalCost: number;
  canProduce: boolean;
  missingIngredients: string[];
  lowStockIngredients: string[];
}

export const RecipeIntegrationTab: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [commissaryItems, setCommissaryItems] = useState<CommissaryItem[]>([]);
  const [recipeIntegrations, setRecipeIntegrations] = useState<RecipeIntegration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchIntegrationData();
  }, []);

  const fetchIntegrationData = async () => {
    setIsLoading(true);
    try {
      // Simulate API call to fetch commissary items and recipe integrations
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock commissary items
      const mockCommissaryItems: CommissaryItem[] = [
        {
          id: '1',
          name: 'All-Purpose Flour',
          category: 'Baking',
          unit: 'kg',
          unit_cost: 2.50,
          current_stock: 50,
          minimum_threshold: 10
        },
        {
          id: '2',
          name: 'Granulated Sugar',
          category: 'Baking',
          unit: 'kg',
          unit_cost: 1.80,
          current_stock: 8,
          minimum_threshold: 15
        },
        {
          id: '3',
          name: 'Chocolate Chips',
          category: 'Baking',
          unit: 'kg',
          unit_cost: 8.00,
          current_stock: 0,
          minimum_threshold: 5
        },
        {
          id: '4',
          name: 'Vanilla Extract',
          category: 'Flavoring',
          unit: 'ml',
          unit_cost: 0.15,
          current_stock: 500,
          minimum_threshold: 100
        }
      ];

      // Mock recipe integrations
      const mockRecipeIntegrations: RecipeIntegration[] = [
        {
          recipeId: 'r1',
          recipeName: 'Chocolate Chip Cookies',
          totalCost: 12.45,
          canProduce: false,
          missingIngredients: ['Chocolate Chips'],
          lowStockIngredients: ['Granulated Sugar']
        },
        {
          recipeId: 'r2',
          recipeName: 'Vanilla Cupcakes',
          totalCost: 8.90,
          canProduce: true,
          missingIngredients: [],
          lowStockIngredients: []
        },
        {
          recipeId: 'r3',
          recipeName: 'Sugar Cookies',
          totalCost: 6.75,
          canProduce: false,
          missingIngredients: [],
          lowStockIngredients: ['Granulated Sugar']
        }
      ];

      setCommissaryItems(mockCommissaryItems);
      setRecipeIntegrations(mockRecipeIntegrations);
    } catch (error) {
      toast.error('Failed to fetch integration data');
      console.error('Fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchIntegrationData();
    setIsRefreshing(false);
    toast.success('Integration data refreshed');
  };

  const filteredCommissaryItems = commissaryItems.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStockStatus = (item: CommissaryItem) => {
    if (item.current_stock === 0) return 'out-of-stock';
    if (item.current_stock <= item.minimum_threshold) return 'low-stock';
    return 'in-stock';
  };

  const getStockBadgeVariant = (status: string) => {
    switch (status) {
      case 'out-of-stock': return 'destructive';
      case 'low-stock': return 'secondary';
      default: return 'default';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading integration data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Refresh */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Commissary Integration Status</h3>
          <p className="text-sm text-muted-foreground">
            Monitor ingredient availability and recipe production readiness
          </p>
        </div>
        <Button onClick={handleRefresh} disabled={isRefreshing} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh Data
        </Button>
      </div>

      {/* Recipe Production Status */}
      <Card>
        <CardHeader>
          <CardTitle>Recipe Production Status</CardTitle>
          <CardDescription>
            Current production readiness for all recipe templates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recipeIntegrations.map((integration) => (
              <div
                key={integration.recipeId}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{integration.recipeName}</h4>
                    {integration.canProduce ? (
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Ready
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Not Ready
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Est. Cost: ₱{integration.totalCost.toFixed(2)}
                  </div>
                  {integration.missingIngredients.length > 0 && (
                    <div className="text-sm text-red-600 mt-1">
                      Missing: {integration.missingIngredients.join(', ')}
                    </div>
                  )}
                  {integration.lowStockIngredients.length > 0 && (
                    <div className="text-sm text-amber-600 mt-1">
                      Low Stock: {integration.lowStockIngredients.join(', ')}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Commissary Inventory Status */}
      <Card>
        <CardHeader>
          <CardTitle>Commissary Inventory Status</CardTitle>
          <CardDescription>
            Current stock levels of ingredients used in recipes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search ingredients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="space-y-2">
            {filteredCommissaryItems.map((item) => {
              const status = getStockStatus(item);
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Package className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {item.category} • ₱{item.unit_cost.toFixed(2)}/{item.unit}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="font-medium">
                        {item.current_stock} {item.unit}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Min: {item.minimum_threshold} {item.unit}
                      </div>
                    </div>
                    <Badge variant={getStockBadgeVariant(status)}>
                      {status === 'out-of-stock' && 'Out of Stock'}
                      {status === 'low-stock' && 'Low Stock'}
                      {status === 'in-stock' && 'In Stock'}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredCommissaryItems.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-8 w-8 mx-auto mb-2" />
              <p>No ingredients found matching your search</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Integration Alerts */}
      <div className="space-y-3">
        {commissaryItems.filter(item => item.current_stock === 0).length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Out of Stock Alert:</strong> {commissaryItems.filter(item => item.current_stock === 0).length} ingredients are completely out of stock, affecting recipe production.
            </AlertDescription>
          </Alert>
        )}

        {commissaryItems.filter(item => item.current_stock > 0 && item.current_stock <= item.minimum_threshold).length > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Low Stock Warning:</strong> {commissaryItems.filter(item => item.current_stock > 0 && item.current_stock <= item.minimum_threshold).length} ingredients are running low and should be restocked soon.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
};
