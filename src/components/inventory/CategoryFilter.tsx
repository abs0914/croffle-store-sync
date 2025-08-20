import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { InventoryItemCategory } from '@/types/inventory';

interface CategoryFilterProps {
  selectedCategory: InventoryItemCategory | 'all';
  onCategoryChange: (category: InventoryItemCategory | 'all') => void;
  className?: string;
}

const categoryLabels: Record<InventoryItemCategory | 'all', string> = {
  all: 'All Categories',
  base_ingredient: 'Base Ingredients',
  classic_sauce: 'Classic Sauces',
  premium_sauce: 'Premium Sauces', 
  classic_topping: 'Classic Toppings',
  premium_topping: 'Premium Toppings',
  packaging: 'Packaging',
  biscuit: 'Biscuits'
};

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  selectedCategory,
  onCategoryChange,
  className
}) => {
  return (
    <Select value={selectedCategory} onValueChange={onCategoryChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder="Filter by category" />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(categoryLabels).map(([value, label]) => (
          <SelectItem key={value} value={value}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};