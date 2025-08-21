import React from 'react';
import { InventoryBasedIngredientForm } from './InventoryBasedIngredientForm';

interface RecipeIngredient {
  id?: string;
  recipe_id?: string;
  inventory_stock_id?: string;
  ingredient_name: string;
  quantity: number;
  unit: string;
  cost_per_unit: number;
}

interface IngredientFormAdapterProps {
  ingredient: RecipeIngredient;
  index: number;
  onUpdate: (index: number, ingredient: RecipeIngredient) => void;
  onRemove: (index: number) => void;
  storeId?: string;
}

export const IngredientFormAdapter: React.FC<IngredientFormAdapterProps> = ({
  ingredient,
  index,
  onUpdate,
  onRemove,
  storeId
}) => {
  const handleUpdate = (index: number, updatedData: any) => {
    onUpdate(index, updatedData);
  };

  return (
    <InventoryBasedIngredientForm
      ingredient={{
        inventory_stock_id: ingredient.inventory_stock_id || '',
        ingredient_name: ingredient.ingredient_name,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        cost_per_unit: ingredient.cost_per_unit
      }}
      index={index}
      onUpdate={handleUpdate}
      onRemove={onRemove}
      storeId={storeId}
    />
  );
};