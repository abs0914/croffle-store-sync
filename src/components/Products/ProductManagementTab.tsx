import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, Plus, Utensils } from 'lucide-react';

interface ProductManagementTabProps {
  onAddProduct: () => void;
}

export function ProductManagementTab({ onAddProduct }: ProductManagementTabProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Direct Inventory Products
            </CardTitle>
            <CardDescription>
              Products linked directly to inventory stock items
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Create products that are directly connected to your inventory stock. 
                Perfect for simple items that don't require recipes.
              </p>
              <Button onClick={onAddProduct} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Create Direct Product
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Utensils className="h-5 w-5" />
              Recipe-Based Products
            </CardTitle>
            <CardDescription>
              Products created from admin-approved recipes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Create products based on recipes with multiple ingredients. 
                Stock availability is calculated from ingredient levels.
              </p>
              <Button onClick={onAddProduct} className="w-full" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Create Recipe Product
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Product Creation Guidelines</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-semibold mb-2">Direct Products</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Linked to inventory stock items</li>
                <li>• Simple stock quantity tracking</li>
                <li>• Immediate availability status</li>
                <li>• Best for simple items</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Recipe Products</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Based on approved recipes</li>
                <li>• Multiple ingredient tracking</li>
                <li>• Calculated availability</li>
                <li>• Best for complex items</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}