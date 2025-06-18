
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Link2, 
  Warehouse, 
  AlertTriangle, 
  CheckCircle, 
  Search,
  Package,
  TrendingUp,
  Clock
} from 'lucide-react';

export const AdminCommissaryIntegrationTab: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');

  // Mock data for commissary integration
  const integrationStats = {
    totalCommissaryItems: 145,
    itemsUsedInRecipes: 89,
    unusedItems: 56,
    lowStockItems: 12,
    averageCostPerUnit: 2.45
  };

  const commissaryItems = [
    {
      id: '1',
      name: 'All-Purpose Flour',
      category: 'Baking',
      currentStock: 250,
      unit: 'kg',
      unitCost: 0.50,
      usedInRecipes: 15,
      status: 'in_stock',
      lastUpdated: '2024-01-15'
    },
    {
      id: '2',
      name: 'Premium Vanilla Extract',
      category: 'Flavoring',
      currentStock: 5,
      unit: 'liters',
      unitCost: 25.00,
      usedInRecipes: 8,
      status: 'low_stock',
      lastUpdated: '2024-01-14'
    },
    {
      id: '3',
      name: 'Organic Raw Sugar',
      category: 'Sweetener',
      currentStock: 180,
      unit: 'kg',
      unitCost: 1.20,
      usedInRecipes: 22,
      status: 'in_stock',
      lastUpdated: '2024-01-15'
    },
    {
      id: '4',
      name: 'Dark Chocolate Chips',
      category: 'Baking',
      currentStock: 0,
      unit: 'kg',
      unitCost: 8.50,
      usedInRecipes: 6,
      status: 'out_of_stock',
      lastUpdated: '2024-01-10'
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'in_stock':
        return <Badge variant="default" className="bg-green-100 text-green-800">In Stock</Badge>;
      case 'low_stock':
        return <Badge variant="destructive" className="bg-amber-100 text-amber-800">Low Stock</Badge>;
      case 'out_of_stock':
        return <Badge variant="destructive">Out of Stock</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const filteredItems = commissaryItems.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Integration Overview */}
      <Alert>
        <Link2 className="h-4 w-4" />
        <AlertDescription>
          Monitor commissary inventory integration with recipe templates. 
          Ensure all recipe ingredients are available and properly costed.
        </AlertDescription>
      </Alert>

      {/* Integration Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Items</p>
                <p className="text-2xl font-bold">{integrationStats.totalCommissaryItems}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Used in Recipes</p>
                <p className="text-2xl font-bold">{integrationStats.itemsUsedInRecipes}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-600" />
              <div>
                <p className="text-sm text-muted-foreground">Unused Items</p>
                <p className="text-2xl font-bold">{integrationStats.unusedItems}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <div>
                <p className="text-sm text-muted-foreground">Low Stock</p>
                <p className="text-2xl font-bold">{integrationStats.lowStockItems}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Avg Cost/Unit</p>
                <p className="text-2xl font-bold">₱{integrationStats.averageCostPerUnit}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Commissary Items List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Warehouse className="h-5 w-5" />
                Commissary Inventory Integration
              </CardTitle>
              <CardDescription>
                Monitor commissary items used in recipe templates and their availability
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 w-64"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredItems.map((item) => (
              <div 
                key={item.id} 
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div>
                      <h4 className="font-medium">{item.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {item.category} • Used in {item.usedInRecipes} recipes
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-medium">
                      {item.currentStock} {item.unit}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      ₱{item.unitCost.toFixed(2)}/{item.unit}
                    </p>
                  </div>
                  
                  {getStatusBadge(item.status)}
                  
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Integration Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Integration Actions</CardTitle>
          <CardDescription>
            Manage commissary inventory integration and synchronization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="h-20 flex-col gap-2">
              <CheckCircle className="h-5 w-5" />
              <span className="text-sm">Sync Inventory</span>
            </Button>
            
            <Button variant="outline" className="h-20 flex-col gap-2">
              <AlertTriangle className="h-5 w-5" />
              <span className="text-sm">Check Missing Items</span>
            </Button>
            
            <Button variant="outline" className="h-20 flex-col gap-2">
              <TrendingUp className="h-5 w-5" />
              <span className="text-sm">Update Costs</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
