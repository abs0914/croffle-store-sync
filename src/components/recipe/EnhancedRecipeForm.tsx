import React, { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Product, ProductVariation } from "@/types";
import { fetchInventoryStock } from "@/services/inventoryManagement/inventoryStockService";
import { InventoryStock } from "@/types/inventoryManagement";

interface EnhancedRecipeFormProps {
  product: Product;
  variation?: ProductVariation | null;
  onClose: () => void;
  onSave: () => void;
}

interface RecipeIngredientForm {
  inventory_stock_id: string;
  commissary_item_id: string;
  quantity: number;
  unit: string;
  cost_per_unit: number;
  available_stock: number;
}

export function EnhancedRecipeForm({ product, variation, onClose, onSave }: EnhancedRecipeFormProps) {
  const [selectedStore, setSelectedStore] = useState('');
  const [inventoryStock, setInventoryStock] = useState<InventoryStock[]>([]);
  const [loadingStock, setLoadingStock] = useState(false);
  const [ingredients, setIngredients] = useState<RecipeIngredientForm[]>([
    {
      inventory_stock_id: '',
      commissary_item_id: '',
      quantity: 0,
      unit: 'kg',
      cost_per_unit: 0,
      available_stock: 0
    }
  ]);

  const loadInventoryStock = useCallback(async () => {
    if (!selectedStore) return;
    
    setLoadingStock(true);
    try {
      const data = await fetchInventoryStock(selectedStore);
      setInventoryStock(data);
    } catch (error) {
      console.error('Error loading inventory stock:', error);
      toast.error('Failed to load inventory stock');
    } finally {
      setLoadingStock(false);
    }
  }, [selectedStore]);

  useEffect(() => {
    if (selectedStore) {
      loadInventoryStock();
    }
  }, [selectedStore, loadInventoryStock]);

  const handleStoreChange = (value: string) => {
    setSelectedStore(value);
  };

  const addIngredient = () => {
    setIngredients([...ingredients, {
      inventory_stock_id: '',
      commissary_item_id: '',
      quantity: 0,
      unit: 'kg',
      cost_per_unit: 0,
      available_stock: 0
    }]);
  };

  const updateIngredient = (index: number, field: keyof RecipeIngredientForm, value: any) => {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: value };
    
    if (field === 'inventory_stock_id') {
      const selectedStock = inventoryStock.find(stock => stock.id === value);
      if (selectedStock) {
        updated[index].available_stock = selectedStock.stock_quantity;
        updated[index].cost_per_unit = selectedStock.cost || 0;
      }
    }
    
    setIngredients(updated);
  };

  const removeIngredient = (index: number) => {
    const updated = [...ingredients];
    updated.splice(index, 1);
    setIngredients(updated);
  };

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>
          {product.name} - Recipe Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="store">Select Store</Label>
          <Select onValueChange={handleStoreChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select a store" />
            </SelectTrigger>
            <SelectContent>
              {/* Replace with actual store list */}
              <SelectItem value="store1">Store 1</SelectItem>
              <SelectItem value="store2">Store 2</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {ingredients.map((ingredient, index) => (
          <div key={index} className="grid grid-cols-6 gap-4 items-end">
            <div className="col-span-2 space-y-2">
              <Label htmlFor={`item-${index}`}>Inventory Item</Label>
              <Select
                value={ingredient.inventory_stock_id}
                onValueChange={(value) => updateIngredient(index, 'inventory_stock_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select item" />
                </SelectTrigger>
                <SelectContent>
                  {inventoryStock.map(stock => (
                    <SelectItem key={stock.id} value={stock.id}>
                      {stock.item} ({stock.unit}) - {stock.stock_quantity} available
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`quantity-${index}`}>Quantity</Label>
              <Input
                id={`quantity-${index}`}
                type="number"
                value={ingredient.quantity}
                onChange={(e) => updateIngredient(index, 'quantity', parseFloat(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`unit-${index}`}>Unit</Label>
              <Input
                id={`unit-${index}`}
                type="text"
                value={ingredient.unit}
                onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Available Stock</Label>
              <Input
                type="text"
                value={ingredient.available_stock}
                disabled
              />
            </div>

            <Button variant="ghost" size="sm" onClick={() => removeIngredient(index)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}

        <Button variant="secondary" onClick={addIngredient}>
          <Plus className="h-4 w-4 mr-2" />
          Add Ingredient
        </Button>

        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onSave}>
            Save Recipe
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
