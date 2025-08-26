
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ChefHat, Settings, MoreVertical, Building2, DollarSign, Clock } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Recipe } from '@/types/inventoryManagement';
import { Store } from '@/types';

interface AdminRecipeListItemProps {
  recipe: Recipe;
  isSelected: boolean;
  onSelect: () => void;
  stores: Store[];
}

export const AdminRecipeListItem: React.FC<AdminRecipeListItemProps> = ({
  recipe,
  isSelected,
  onSelect,
  stores
}) => {
  const store = stores.find(s => s.id === recipe.store_id);
  
  // Calculate recipe cost from ingredients
  const recipeCost = recipe.ingredients?.reduce((sum, ingredient) => {
    const cost = ingredient.inventory_stock?.cost || 0;
    return sum + (cost * ingredient.quantity);
  }, 0) || 0;

  const costPerServing = recipe.yield_quantity > 0 ? recipeCost / recipe.yield_quantity : 0;

  return (
    <Card className={`transition-all ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:shadow-sm'}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <Checkbox
              checked={isSelected}
              onCheckedChange={onSelect}
              onClick={(e) => e.stopPropagation()}
            />
            
            <div className="flex items-center gap-3">
              <ChefHat className="h-5 w-5 text-purple-600" />
              <div>
                <h3 className="font-semibold">{recipe.name}</h3>
                <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                  <div className="flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    <span>{store?.name || 'Unknown Store'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>Yield: {recipe.yield_quantity}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    <span>₱{recipeCost.toFixed(2)} (₱{costPerServing.toFixed(2)}/serving)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Badge variant={recipe.is_active ? 'default' : 'secondary'}>
              {recipe.is_active ? 'Active' : 'Draft'}
            </Badge>
            
            <div className="text-xs text-gray-500">
              {recipe.ingredients?.length || 0} ingredients
            </div>
            
            <div className="text-xs text-gray-500">
              v{recipe.version || 1}
            </div>
            
            <Button
              variant="outline"
              size="sm"
            >
              <Settings className="h-4 w-4 mr-2" />
              Configure
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  Edit Recipe
                </DropdownMenuItem>
                <DropdownMenuItem>
                  Deploy to Stores
                </DropdownMenuItem>
                <DropdownMenuItem>
                  View Analytics
                </DropdownMenuItem>
                <DropdownMenuItem>
                  Duplicate Recipe
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
