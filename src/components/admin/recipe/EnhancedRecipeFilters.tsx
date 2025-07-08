import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, Filter, Package, Layers, Component, X } from 'lucide-react';
import { UnifiedRecipeFilters } from '@/hooks/admin/useUnifiedRecipeState';

interface EnhancedRecipeFiltersProps {
  filters: UnifiedRecipeFilters;
  onFiltersChange: (filters: UnifiedRecipeFilters) => void;
  stores: Array<{ id: string; name: string }>;
  totalItems: number;
  filteredItems: number;
}

const RECIPE_TYPE_ICONS = {
  single: Package,
  combo: Layers,
  component: Component
};

const RECIPE_TYPE_LABELS = {
  single: 'Single Recipe',
  combo: 'Combo Recipe',
  component: 'Component Recipe'
};

export function EnhancedRecipeFilters({
  filters,
  onFiltersChange,
  stores,
  totalItems,
  filteredItems
}: EnhancedRecipeFiltersProps) {
  const updateFilter = (key: keyof UnifiedRecipeFilters, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({
      search: '',
      status: 'all',
      store: 'all',
      category: 'all',
      itemType: 'all',
      recipeType: 'all'
    });
  };

  const activeFilterCount = Object.entries(filters).filter(([key, value]) => 
    key !== 'search' && value !== 'all'
  ).length;

  return (
    <div className="space-y-4">
      {/* Search and Primary Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search recipes and templates..."
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2">
          <Select value={filters.itemType} onValueChange={(value) => updateFilter('itemType', value)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Item Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Items</SelectItem>
              <SelectItem value="template">Templates</SelectItem>
              <SelectItem value="recipe">Recipes</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.recipeType} onValueChange={(value) => updateFilter('recipeType', value)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Recipe Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="single">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Single
                </div>
              </SelectItem>
              <SelectItem value="combo">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  Combo
                </div>
              </SelectItem>
              <SelectItem value="component">
                <div className="flex items-center gap-2">
                  <Component className="h-4 w-4" />
                  Component
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Secondary Filters */}
      <div className="flex flex-wrap gap-2">
        <Select value={filters.status} onValueChange={(value) => updateFilter('status', value)}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.store} onValueChange={(value) => updateFilter('store', value)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Store" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stores</SelectItem>
            {stores.map((store) => (
              <SelectItem key={store.id} value={store.id}>
                {store.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {activeFilterCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={clearFilters}
            className="h-9"
          >
            <X className="h-4 w-4 mr-1" />
            Clear ({activeFilterCount})
          </Button>
        )}
      </div>

      {/* Active Filters Display */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.itemType !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              <Filter className="h-3 w-3" />
              {filters.itemType === 'template' ? 'Templates' : 'Recipes'}
              <button 
                onClick={() => updateFilter('itemType', 'all')}
                className="ml-1 hover:bg-secondary-foreground/20 rounded-full"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          
          {filters.recipeType !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              {React.createElement(RECIPE_TYPE_ICONS[filters.recipeType as keyof typeof RECIPE_TYPE_ICONS], { className: "h-3 w-3" })}
              {RECIPE_TYPE_LABELS[filters.recipeType as keyof typeof RECIPE_TYPE_LABELS]}
              <button 
                onClick={() => updateFilter('recipeType', 'all')}
                className="ml-1 hover:bg-secondary-foreground/20 rounded-full"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {filters.status !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              Status: {filters.status}
              <button 
                onClick={() => updateFilter('status', 'all')}
                className="ml-1 hover:bg-secondary-foreground/20 rounded-full"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {filters.store !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              Store: {stores.find(s => s.id === filters.store)?.name || filters.store}
              <button 
                onClick={() => updateFilter('store', 'all')}
                className="ml-1 hover:bg-secondary-foreground/20 rounded-full"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}

      {/* Results Summary */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredItems} of {totalItems} items
        {filters.search && ` matching "${filters.search}"`}
      </div>
    </div>
  );
}