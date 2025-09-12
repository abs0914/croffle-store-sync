import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertCircle, Trash2, AlertTriangle } from 'lucide-react';

interface RecipeIngredient {
  id: string;
  recipe_id: string;
  inventory_stock_id: string;
  quantity: number;
  unit: string;
  ingredient_group_name?: string;
  is_optional?: boolean;
  display_order?: number;
  inventory_stock?: {
    id: string;
    item: string;
    unit: string;
    cost: number | null;
  } | null;
}

interface InventoryItem {
  id: string;
  item: string;
  unit: string;
  cost: number | null;
  store_id: string;
  is_active: boolean | null;
}

interface IngredientGroupCardProps {
  groupName: string;
  ingredients: RecipeIngredient[];
  inventoryItems: InventoryItem[];
  isOptional: boolean;
  isSaving: boolean;
  onUpdateMapping: (ingredientId: string, inventoryStockId: string) => Promise<void>;
  onUpdateQuantity: (ingredientId: string, quantity: number) => Promise<void>;
  onDeleteIngredient: (ingredientId: string) => Promise<void>;
}

export const IngredientGroupCard: React.FC<IngredientGroupCardProps> = ({
  groupName,
  ingredients,
  inventoryItems,
  isOptional,
  isSaving,
  onUpdateMapping,
  onUpdateQuantity,
  onDeleteIngredient
}) => {
  const getGroupContextualInfo = () => {
    switch (groupName.toLowerCase()) {
      case 'base':
        return {
          helpText: 'Base ingredients are always included in every product and deducted from inventory.',
          bgColor: 'bg-emerald-50',
          borderColor: 'border-emerald-200'
        };
      case 'packaging':
        return {
          helpText: 'Packaging materials are always included and deducted from inventory.',
          bgColor: 'bg-slate-50', 
          borderColor: 'border-slate-200'
        };
      case 'sauce':
        return {
          helpText: 'Customer selects one sauce option. Only the selected sauce is deducted from inventory.',
          bgColor: 'bg-amber-50',
          borderColor: 'border-amber-200'
        };
      case 'topping':
        return {
          helpText: 'Customer selects topping option(s). Only selected toppings are deducted from inventory.',
          bgColor: 'bg-purple-50',
          borderColor: 'border-purple-200'
        };
      default:
        return {
          helpText: isOptional ? 'Customer can select from these optional ingredients.' : 'All ingredients in this group are included.',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200'
        };
    }
  };

  const contextInfo = getGroupContextualInfo();

  const getBadgeColor = (ingredient: RecipeIngredient) => {
    if (!ingredient.inventory_stock_id) {
      return 'border-amber-300 bg-amber-50 text-amber-800';
    }
    return 'border-emerald-300 bg-emerald-50 text-emerald-800';
  };

  return (
    <div className="space-y-4">
      {/* Group Context Info */}
      <div className={`p-3 rounded-lg border ${contextInfo.borderColor} ${contextInfo.bgColor}`}>
        <p className="text-sm text-gray-700">{contextInfo.helpText}</p>
      </div>

      {/* Ingredients List */}
      <div className="space-y-3">
        {ingredients.map((ingredient) => {
          const isUnmapped = !ingredient.inventory_stock_id;
          
          return (
            <Card 
              key={ingredient.id} 
              className={`border ${isUnmapped ? 'border-amber-300 bg-amber-50/30' : 'border-gray-200'}`}
            >
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                  {/* Inventory Item Selection */}
                  <div className="md:col-span-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Label className="text-sm font-medium">Inventory Item</Label>
                      {isUnmapped && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <AlertTriangle className="w-4 h-4 text-amber-500" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>This ingredient needs to be mapped to an inventory item for accurate tracking.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                    <Select
                      value={ingredient.inventory_stock_id || ''}
                      onValueChange={(value) => onUpdateMapping(ingredient.id, value)}
                      disabled={isSaving}
                    >
                      <SelectTrigger className={isUnmapped ? 'border-amber-400 focus:border-amber-500' : ''}>
                        <SelectValue placeholder="Select inventory item..." />
                      </SelectTrigger>
                      <SelectContent>
                        {inventoryItems.map(item => (
                          <SelectItem key={item.id} value={item.id} textValue={item.item}>
                            <div className="flex items-center justify-between w-full">
                              <span>{item.item}</span>
                              <span className="text-xs text-muted-foreground ml-2">
                                {item.unit} - ₱{item.cost || 0}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Current Selection Display */}
                  <div className="md:col-span-3">
                    <Label className="text-sm font-medium">Selected Item</Label>
                    <div className={`mt-2 p-2 rounded border text-sm ${getBadgeColor(ingredient)}`}>
                      {ingredient.inventory_stock?.item || (
                        <span className="flex items-center gap-1 text-amber-700">
                          <AlertCircle className="w-3 h-3" />
                          Not selected
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Quantity Input */}
                  <div className="md:col-span-2">
                    <Label className="text-sm font-medium">Quantity</Label>
                    <Input
                      type="number"
                      value={ingredient.quantity}
                      onChange={(e) => {
                        const newQuantity = parseFloat(e.target.value) || 0;
                        if (newQuantity !== ingredient.quantity) {
                          onUpdateQuantity(ingredient.id, newQuantity);
                        }
                      }}
                      className="mt-2"
                      disabled={isSaving}
                      min="0"
                      step="0.1"
                    />
                  </div>

                  {/* Unit Display */}
                  <div className="md:col-span-2">
                    <Label className="text-sm font-medium">Unit</Label>
                    <div className="mt-2 p-2 bg-muted rounded text-sm">
                      {ingredient.inventory_stock?.unit || ingredient.unit}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="md:col-span-1 flex justify-end items-start mt-6">
                    <Button
                      onClick={() => onDeleteIngredient(ingredient.id)}
                      disabled={isSaving}
                      variant="ghost"
                      size="sm"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                {/* Cost Information & Warnings */}
                <div className="mt-3 pt-3 border-t">
                  <div className="flex items-center justify-between">
                    {ingredient.inventory_stock?.cost ? (
                      <div className="text-sm text-muted-foreground">
                        Cost: ₱{ingredient.inventory_stock.cost}/unit × {ingredient.quantity} = ₱{(ingredient.inventory_stock.cost * ingredient.quantity).toFixed(2)}
                      </div>
                    ) : (
                      <div className="text-sm text-amber-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Cost calculation unavailable - map to inventory item
                      </div>
                    )}
                    
                    {isOptional && (
                      <Badge variant="outline" className="text-xs">
                        Customer Choice
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Group Summary */}
      {ingredients.length > 0 && (
        <div className={`p-3 rounded border ${contextInfo.borderColor} ${contextInfo.bgColor}`}>
          <div className="flex items-center justify-between text-sm">
            <span>
              <strong>{ingredients.length}</strong> ingredients in {groupName} group
            </span>
            <span>
              <strong>{ingredients.filter(ing => ing.inventory_stock_id).length}</strong> mapped
            </span>
            <span>
              Group Cost: <strong>₱{ingredients.reduce((total, ing) => {
                const cost = ing.inventory_stock?.cost || 0;
                return total + (ing.quantity * cost);
              }, 0).toFixed(2)}</strong>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};