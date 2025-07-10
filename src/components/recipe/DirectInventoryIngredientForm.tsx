import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Trash2, Package, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { 
  DirectInventoryIngredient, 
  getDirectInventoryItems, 
  validateIngredientQuantity,
  DIRECT_INVENTORY_UNITS,
  MINI_CROFFLE_INGREDIENTS 
} from '@/services/recipeManagement/directInventoryService';

interface DirectInventoryIngredientFormProps {
  ingredient: DirectInventoryIngredient;
  index: number;
  storeId?: string;
  onUpdate: (index: number, field: keyof DirectInventoryIngredient, value: any) => void;
  onRemove: (index: number) => void;
}

export const DirectInventoryIngredientForm: React.FC<DirectInventoryIngredientFormProps> = ({
  ingredient,
  index,
  storeId,
  onUpdate,
  onRemove
}) => {
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [quantityError, setQuantityError] = useState<string>('');

  useEffect(() => {
    loadInventoryItems();
  }, [storeId]);

  useEffect(() => {
    // Auto-detect fractional support when ingredient name changes
    const shouldSupportFractional = MINI_CROFFLE_INGREDIENTS.some(miniIngredient => 
      ingredient.ingredient_name.toLowerCase().includes(miniIngredient.toLowerCase())
    );
    if (ingredient.supports_fractional !== shouldSupportFractional) {
      onUpdate(index, 'supports_fractional', shouldSupportFractional);
    }
  }, [ingredient.ingredient_name, ingredient.supports_fractional, index, onUpdate]);

  useEffect(() => {
    // Validate quantity when it changes
    if (ingredient.quantity > 0) {
      const isValid = validateIngredientQuantity(ingredient.ingredient_name, ingredient.quantity);
      if (!isValid) {
        if (ingredient.supports_fractional) {
          setQuantityError('Quantity must be between 0.1 and 100 for Mini Croffle ingredients');
        } else {
          setQuantityError('Quantity must be a whole number between 1 and 1000');
        }
      } else {
        setQuantityError('');
      }
    } else {
      setQuantityError('');
    }
  }, [ingredient.quantity, ingredient.ingredient_name, ingredient.supports_fractional]);

  const loadInventoryItems = async () => {
    setLoading(true);
    try {
      const items = await getDirectInventoryItems(storeId);
      setInventoryItems(items);
    } catch (error) {
      console.error('Error loading inventory items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInventoryItemSelect = (itemId: string) => {
    const selectedItem = inventoryItems.find(item => item.id === itemId);
    if (selectedItem) {
      onUpdate(index, 'inventory_stock_id', itemId);
      onUpdate(index, 'ingredient_name', selectedItem.item);
      onUpdate(index, 'unit', selectedItem.display_unit);
      onUpdate(index, 'estimated_cost_per_unit', selectedItem.cost_per_unit);
      onUpdate(index, 'supports_fractional', selectedItem.supports_fractional);
    }
  };

  const getQuantityStep = () => {
    return ingredient.supports_fractional ? '0.1' : '1';
  };

  const getQuantityMin = () => {
    return ingredient.supports_fractional ? '0.1' : '1';
  };

  return (
    <Card className="relative">
      <CardContent className="p-6">
        {/* Header with fractional support indicator */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            <span className="font-medium">Direct Inventory Ingredient</span>
          </div>
          {ingredient.supports_fractional && (
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Fractional Support
            </Badge>
          )}
        </div>

        {/* Mini Croffle ingredients notice */}
        {ingredient.supports_fractional && (
          <Alert className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This ingredient supports fractional quantities (e.g., 0.5, 1.5) for Mini Croffle recipes.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          {/* Inventory Item Selection */}
          <div>
            <Label>Select Inventory Item</Label>
            <Select
              value={ingredient.inventory_stock_id || ''}
              onValueChange={handleInventoryItemSelect}
              disabled={loading}
            >
              <SelectTrigger className="mt-2">
                <SelectValue placeholder={loading ? "Loading..." : "Choose inventory item"} />
              </SelectTrigger>
              <SelectContent>
                {inventoryItems.map(item => (
                  <SelectItem key={item.id} value={item.id}>
                    <div className="flex items-center justify-between w-full">
                      <span>{item.item}</span>
                      <div className="flex items-center gap-2 ml-4">
                        <Badge variant="outline">{item.display_unit}</Badge>
                        {item.supports_fractional && (
                          <Badge variant="secondary" className="text-xs">0.5×</Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {item.available_servings.toFixed(1)} available
                        </span>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Manual Ingredient Name (if no inventory item selected) */}
          {!ingredient.inventory_stock_id && (
            <div>
              <Label>Ingredient Name</Label>
              <Input
                value={ingredient.ingredient_name}
                onChange={(e) => onUpdate(index, 'ingredient_name', e.target.value)}
                placeholder="Enter ingredient name"
                className="mt-2"
              />
            </div>
          )}

          {/* Quantity and Unit */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Quantity</Label>
              <Input
                type="number"
                min={getQuantityMin()}
                step={getQuantityStep()}
                value={ingredient.quantity}
                onChange={(e) => onUpdate(index, 'quantity', parseFloat(e.target.value) || 0)}
                className={`mt-2 ${quantityError ? 'border-red-500' : ''}`}
                placeholder={ingredient.supports_fractional ? "e.g., 0.5, 1.5" : "e.g., 1, 2, 3"}
              />
              {quantityError && (
                <p className="text-xs text-red-500 mt-1">{quantityError}</p>
              )}
            </div>

            <div>
              <Label>Unit</Label>
              <Select
                value={ingredient.unit}
                onValueChange={(value) => onUpdate(index, 'unit', value)}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DIRECT_INVENTORY_UNITS.map(unit => (
                    <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Cost per Unit */}
          <div>
            <Label>Estimated Cost per Unit (₱)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={ingredient.estimated_cost_per_unit || ''}
              onChange={(e) => onUpdate(index, 'estimated_cost_per_unit', parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              className="mt-2"
            />
          </div>

          {/* Location Type */}
          <div>
            <Label>Location Type</Label>
            <Select
              value={ingredient.location_type}
              onValueChange={(value: any) => onUpdate(index, 'location_type', value)}
            >
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                <SelectItem value="inside_cebu">Inside Cebu</SelectItem>
                <SelectItem value="outside_cebu">Outside Cebu</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Total Cost Display */}
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex justify-between items-center text-sm">
              <span>Total Cost:</span>
              <span className="font-medium">
                ₱{((ingredient.estimated_cost_per_unit || 0) * ingredient.quantity).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Remove Button */}
        <div className="flex justify-end mt-6 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onRemove(index)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Remove
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};