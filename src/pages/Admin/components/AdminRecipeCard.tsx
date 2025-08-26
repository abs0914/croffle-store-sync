
import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ChefHat, Settings, MoreVertical, Building2, DollarSign, Clock } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Recipe } from '@/types/inventoryManagement';
import { Store } from '@/types';

interface AdminRecipeCardProps {
  recipe: Recipe;
  isSelected: boolean;
  onSelect: () => void;
  stores: Store[];
}

export const AdminRecipeCard: React.FC<AdminRecipeCardProps> = ({
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
    <Card className={`relative transition-all ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:shadow-md'}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={isSelected}
              onCheckedChange={onSelect}
              onClick={(e) => e.stopPropagation()}
            />
            <div className="flex items-center gap-2">
              <ChefHat className="h-5 w-5 text-purple-600" />
              <h3 className="font-semibold text-lg truncate">{recipe.name}</h3>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <Badge variant={recipe.is_active ? 'default' : 'secondary'}>
              {recipe.is_active ? 'Active' : 'Draft'}
            </Badge>
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
      </CardHeader>
      
      <CardContent className="space-y-3">
        {recipe.description && (
          <p className="text-sm text-gray-600 line-clamp-2">{recipe.description}</p>
        )}
        
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <Building2 className="h-4 w-4" />
            <span>{store?.name || 'Unknown Store'}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>Yield: {recipe.yield_quantity}</span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1 text-green-600">
            <DollarSign className="h-4 w-4" />
            <span>₱{recipeCost.toFixed(2)} total</span>
          </div>
          <div className="text-gray-500">
            ₱{costPerServing.toFixed(2)} per serving
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Ingredients ({recipe.ingredients?.length || 0}):</p>
          <div className="space-y-1 max-h-20 overflow-y-auto">
            {recipe.ingredients?.slice(0, 3).map((ingredient, index) => (
              <div key={ingredient.id} className="text-xs text-gray-600 flex justify-between">
                <span>{ingredient.inventory_stock?.item || 'Unknown'}</span>
                <span>{ingredient.quantity} {ingredient.unit}</span>
              </div>
            ))}
            {(recipe.ingredients?.length || 0) > 3 && (
              <div className="text-xs text-gray-500">
                +{(recipe.ingredients?.length || 0) - 3} more ingredients
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center justify-between pt-3 border-t">
          <div className="text-xs text-gray-500">
            Version: {recipe.version || 1}
          </div>
          <Button
            variant="outline"
            size="sm"
          >
            <Settings className="h-4 w-4 mr-2" />
            Configure
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
