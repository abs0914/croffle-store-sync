
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Trash2 } from 'lucide-react';
import { RecipeTemplateIngredientInput, INGREDIENT_CATEGORIES, INGREDIENT_TYPES } from '@/services/recipeManagement/types';
import { fetchOrderableItems } from '@/services/inventoryManagement/commissaryInventoryService';
import { CommissaryInventoryItem } from '@/types/commissary';

interface IngredientFormProps {
  ingredient: RecipeTemplateIngredientInput;
  index: number;
  onUpdate: (index: number, field: keyof RecipeTemplateIngredientInput, value: any) => void;
  onRemove: (index: number) => void;
  showLocationBadge?: boolean;
  locationColor?: string;
}

export const IngredientForm: React.FC<IngredientFormProps> = ({
  ingredient,
  index,
  onUpdate,
  onRemove,
  showLocationBadge = false,
  locationColor = 'bg-gray-500'
}) => {
  const [orderableItems, setOrderableItems] = useState<CommissaryInventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadOrderableItems = async () => {
      try {
        const items = await fetchOrderableItems();
        const finishedProducts = items.filter(item => 
          item.item_type === 'orderable_item'
        );
        const uniqueItems = finishedProducts.filter((item, idx, self) =>
          idx === self.findIndex(i => i.name.toLowerCase() === item.name.toLowerCase())
        );
        setOrderableItems(uniqueItems);
      } catch (error) {
        console.error('Error loading orderable items:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadOrderableItems();
  }, []);

  return (
    <div className="grid grid-cols-6 gap-2 items-end p-3 border rounded-lg relative">
      {showLocationBadge && (
        <div className="absolute -top-2 -right-2">
          <div className={`w-4 h-4 rounded-full ${locationColor}`} />
        </div>
      )}
      
      <div>
        <Label>Ingredient Name</Label>
        {isLoading ? (
          <Input
            value={ingredient.ingredient_name}
            onChange={(e) => onUpdate(index, 'ingredient_name', e.target.value)}
            placeholder="Loading ingredients..."
            disabled
          />
        ) : (
          <Select
            value={ingredient.ingredient_name}
            onValueChange={(value) => onUpdate(index, 'ingredient_name', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select ingredient" />
            </SelectTrigger>
            <SelectContent>
              {orderableItems.map(item => (
                <SelectItem key={item.id} value={item.name}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      
      <div>
        <Label>Category</Label>
        <Select
          value={ingredient.ingredient_category}
          onValueChange={(value) => onUpdate(index, 'ingredient_category', value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {INGREDIENT_CATEGORIES.filter(category => category.trim() !== '').map(category => (
              <SelectItem key={category} value={category}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Type</Label>
        <Select
          value={ingredient.ingredient_type}
          onValueChange={(value) => onUpdate(index, 'ingredient_type', value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {INGREDIENT_TYPES.filter(type => type.trim() !== '').map(type => (
              <SelectItem key={type} value={type}>
                {type.replace('_', ' ').charAt(0).toUpperCase() + type.replace('_', ' ').slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div>
        <Label>Quantity</Label>
        <Input
          type="number"
          min="0"
          step="0.1"
          value={ingredient.quantity}
          onChange={(e) => onUpdate(index, 'quantity', parseFloat(e.target.value) || 0)}
        />
      </div>
      
      <div>
        <Label>Unit</Label>
        <Select
          value={ingredient.unit}
          onValueChange={(value) => onUpdate(index, 'unit', value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="kg">kg</SelectItem>
            <SelectItem value="g">g</SelectItem>
            <SelectItem value="piece">piece</SelectItem>
            <SelectItem value="pieces">pieces</SelectItem>
            <SelectItem value="serving">serving</SelectItem>
            <SelectItem value="portion">portion</SelectItem>
            <SelectItem value="pair">pair</SelectItem>
            <SelectItem value="scoop">scoop</SelectItem>
            <SelectItem value="liters">liters</SelectItem>
            <SelectItem value="ml">ml</SelectItem>
            <SelectItem value="cups">cups</SelectItem>
            <SelectItem value="tbsp">tbsp</SelectItem>
            <SelectItem value="tsp">tsp</SelectItem>
            <SelectItem value="boxes">boxes</SelectItem>
            <SelectItem value="packs">packs</SelectItem>
            <SelectItem value="Piping Bag">Piping Bag</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Cost per Unit (₱)</Label>
        <Input
          type="number"
          min="0"
          step="0.01"
          value={ingredient.cost_per_unit || 0}
          onChange={(e) => onUpdate(index, 'cost_per_unit', parseFloat(e.target.value) || 0)}
          placeholder="0.00"
        />
      </div>
      
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onRemove(index)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
};
