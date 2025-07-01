
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Trash2 } from 'lucide-react';
import { RecipeTemplateIngredientInput } from '@/services/recipeManagement/types';
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
  const [selectedItemCategory, setSelectedItemCategory] = useState<string>('');

  useEffect(() => {
    const loadData = async () => {
      try {
        const items = await fetchOrderableItems();
        
        const finishedProducts = items.filter(item => 
          item.item_type === 'orderable_item'
        );
        const uniqueItems = finishedProducts.filter((item, idx, self) =>
          idx === self.findIndex(i => i.name.toLowerCase() === item.name.toLowerCase())
        );
        
        setOrderableItems(uniqueItems);
        
        // Set category for current ingredient if it exists
        if (ingredient.ingredient_name) {
          const currentItem = uniqueItems.find(item => 
            item.name === ingredient.ingredient_name
          );
          if (currentItem) {
            setSelectedItemCategory(currentItem.category);
          }
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const handleIngredientChange = (value: string) => {
    onUpdate(index, 'ingredient_name', value);
    
    // Update the displayed category based on selected item
    const selectedItem = orderableItems.find(item => item.name === value);
    if (selectedItem) {
      setSelectedItemCategory(selectedItem.category);
    } else {
      setSelectedItemCategory('');
    }
  };

  return (
    <div className="grid grid-cols-5 gap-2 items-end p-3 border rounded-lg relative">
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
            onValueChange={handleIngredientChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select ingredient" />
            </SelectTrigger>
            <SelectContent>
              {orderableItems.map(item => (
                <SelectItem key={item.id} value={item.name}>
                  <div className="flex flex-col">
                    <span>{item.name}</span>
                    <span className="text-xs text-muted-foreground">{item.category}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {selectedItemCategory && (
          <div className="mt-1">
            <Badge variant="outline" className="text-xs">
              {selectedItemCategory}
            </Badge>
          </div>
        )}
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
