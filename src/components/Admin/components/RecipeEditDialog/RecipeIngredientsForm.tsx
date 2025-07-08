
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RecipeIngredientsFormProps {
  ingredients: any[];
  onChange: (ingredients: any[]) => void;
  storeId?: string;
}

export function RecipeIngredientsForm({ ingredients, onChange, storeId }: RecipeIngredientsFormProps) {
  const [inventoryStock, setInventoryStock] = useState<any[]>([]);

  useEffect(() => {
    if (storeId) {
      loadInventoryStock();
    }
  }, [storeId]);

  const loadInventoryStock = async () => {
    if (!storeId) return;

    try {
      const { data } = await supabase
        .from('inventory_stock')
        .select('*')
        .eq('store_id', storeId)
        .eq('is_active', true)
        .order('item');

      setInventoryStock(data || []);
    } catch (error) {
      console.error('Error loading inventory stock:', error);
      toast.error('Failed to load inventory items');
    }
  };

  const addIngredient = () => {
    const newIngredient = {
      id: `temp-${Date.now()}`,
      ingredient_name: '',
      quantity: 1,
      unit: 'kg',
      cost_per_unit: 0,
      notes: '',
      inventory_stock_id: '',
      isNew: true
    };
    onChange([...ingredients, newIngredient]);
  };

  const updateIngredient = (index: number, field: string, value: any) => {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: value };

    // If inventory stock is selected, update ingredient name and cost
    if (field === 'inventory_stock_id' && value) {
      const stockItem = inventoryStock.find(item => item.id === value);
      if (stockItem) {
        updated[index].ingredient_name = stockItem.item;
        updated[index].cost_per_unit = stockItem.cost || 0;
        updated[index].unit = stockItem.unit || 'kg';
      }
    }

    onChange(updated);
  };

  const removeIngredient = (index: number) => {
    const updated = ingredients.filter((_, i) => i !== index);
    onChange(updated);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Label className="text-lg font-semibold">Ingredients</Label>
        <Button type="button" onClick={addIngredient} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Ingredient
        </Button>
      </div>

      <div className="space-y-4">
        {ingredients.map((ingredient, index) => (
          <div key={ingredient.id || index} className="grid grid-cols-12 gap-2 items-end p-4 border rounded-lg">
            <div className="col-span-3">
              <Label>Inventory Item</Label>
              <Select
                value={ingredient.inventory_stock_id || ''}
                onValueChange={(value) => updateIngredient(index, 'inventory_stock_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select item" />
                </SelectTrigger>
                <SelectContent>
                  {inventoryStock
                    .filter(stock => stock.id && stock.id.trim() !== '')
                    .map((stock) => (
                      <SelectItem key={stock.id} value={stock.id}>
                        {stock.item} ({stock.unit})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <Label>Name</Label>
              <Input
                value={ingredient.ingredient_name || ''}
                onChange={(e) => updateIngredient(index, 'ingredient_name', e.target.value)}
                placeholder="Ingredient name"
              />
            </div>

            <div className="col-span-2">
              <Label>Quantity</Label>
              <Input
                type="number"
                min="0"
                step="0.1"
                value={ingredient.quantity || 0}
                onChange={(e) => updateIngredient(index, 'quantity', parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="col-span-2">
              <Label>Unit</Label>
              <Select
                value={ingredient.unit || 'kg'}
                onValueChange={(value) => updateIngredient(index, 'unit', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kg">kg</SelectItem>
                  <SelectItem value="g">g</SelectItem>
                  <SelectItem value="pieces">pieces</SelectItem>
                  <SelectItem value="liters">liters</SelectItem>
                  <SelectItem value="ml">ml</SelectItem>
                  <SelectItem value="boxes">boxes</SelectItem>
                  <SelectItem value="packs">packs</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <Label>Cost per Unit</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={ingredient.cost_per_unit || 0}
                onChange={(e) => updateIngredient(index, 'cost_per_unit', parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="col-span-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => removeIngredient(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}

        {ingredients.length === 0 && (
          <div className="text-center py-8 text-muted-foreground border-2 border-dashed border-gray-200 rounded-lg">
            <p>No ingredients added yet.</p>
            <p className="text-sm">Click "Add Ingredient" to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
}
