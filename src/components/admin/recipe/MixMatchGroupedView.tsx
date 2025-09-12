import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  ChevronDown, 
  ChevronRight, 
  CheckCircle2, 
  AlertTriangle, 
  Package, 
  Zap,
  RefreshCw 
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { IngredientGroupCard } from './IngredientGroupCard';
import { toast } from 'sonner';

interface MixMatchProduct {
  id: string;
  name: string;
  product_name: string;
  description?: string;
}

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

interface GroupedIngredients {
  [groupName: string]: RecipeIngredient[];
}

interface MixMatchGroupedViewProps {
  product: MixMatchProduct;
  ingredients: RecipeIngredient[];
  inventoryItems: InventoryItem[];
  isLoading: boolean;
  isSaving: boolean;
  onUpdateMapping: (ingredientId: string, inventoryStockId: string) => Promise<void>;
  onUpdateQuantity: (ingredientId: string, quantity: number) => Promise<void>;
  onDeleteIngredient: (ingredientId: string) => Promise<void>;
  onAddIngredient: () => Promise<void>;
  onAutoMap: () => Promise<void>;
  onRefresh: () => void;
}

export const MixMatchGroupedView: React.FC<MixMatchGroupedViewProps> = ({
  product,
  ingredients,
  inventoryItems,
  isLoading,
  isSaving,
  onUpdateMapping,
  onUpdateQuantity,
  onDeleteIngredient,
  onAddIngredient,
  onAutoMap,
  onRefresh
}) => {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['base', 'packaging']));

  // Group ingredients by ingredient_group_name
  const groupedIngredients: GroupedIngredients = React.useMemo(() => {
    const groups: GroupedIngredients = {};
    
    ingredients.forEach(ingredient => {
      const groupName = ingredient.ingredient_group_name || 'ungrouped';
      if (!groups[groupName]) {
        groups[groupName] = [];
      }
      groups[groupName].push(ingredient);
    });
    
    // Sort ingredients within each group by display_order
    Object.values(groups).forEach(group => {
      group.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    });
    
    return groups;
  }, [ingredients]);

  // Group metadata for display
  const getGroupInfo = (groupName: string) => {
    const group = groupedIngredients[groupName];
    if (!group) return null;
    
    const isOptional = group[0]?.is_optional || false;
    const mapped = group.filter(ing => ing.inventory_stock_id).length;
    const total = group.length;
    
    return {
      isOptional,
      mapped,
      total,
      isComplete: mapped === total,
      ingredients: group
    };
  };

  const getGroupIcon = (groupName: string) => {
    switch (groupName.toLowerCase()) {
      case 'base':
        return '🔧';
      case 'sauce':
        return '🎯';
      case 'topping':
        return '🍓';
      case 'packaging':
        return '📦';
      default:
        return '🏷️';
    }
  };

  const getGroupDescription = (groupName: string, isOptional: boolean) => {
    switch (groupName.toLowerCase()) {
      case 'base':
        return 'Always included with every product';
      case 'sauce':
        return isOptional ? 'Customer selects 1 sauce option' : 'All sauce ingredients included';
      case 'topping':
        return isOptional ? 'Customer selects 1-2 topping options' : 'All topping ingredients included';
      case 'packaging':
        return 'Always included packaging materials';
      default:
        return isOptional ? 'Optional ingredients' : 'Required ingredients';
    }
  };

  const toggleGroup = (groupName: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupName)) {
      newExpanded.delete(groupName);
    } else {
      newExpanded.add(groupName);
    }
    setExpandedGroups(newExpanded);
  };

  const calculateGroupCost = (groupName: string) => {
    const group = groupedIngredients[groupName];
    if (!group) return 0;
    
    return group.reduce((total, ing) => {
      const cost = ing.inventory_stock?.cost || 0;
      return total + (ing.quantity * cost);
    }, 0);
  };

  const calculateTotalCost = () => {
    return Object.keys(groupedIngredients).reduce((total, groupName) => {
      return total + calculateGroupCost(groupName);
    }, 0);
  };

  const getOverallStatus = () => {
    const totalIngredients = ingredients.length;
    const mappedIngredients = ingredients.filter(ing => ing.inventory_stock_id).length;
    
    if (totalIngredients === 0) return { status: 'empty', message: 'No ingredients', color: 'bg-destructive' };
    if (mappedIngredients === totalIngredients) return { status: 'complete', message: 'All Mapped', color: 'bg-emerald-500' };
    
    const percentage = Math.round((mappedIngredients / totalIngredients) * 100);
    return { 
      status: 'incomplete', 
      message: `${percentage}% Mapped (${mappedIngredients}/${totalIngredients})`, 
      color: percentage > 50 ? 'bg-amber-500' : 'bg-destructive'
    };
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin mr-2" />
            Loading Mix & Match ingredients...
          </div>
        </CardContent>
      </Card>
    );
  }

  const overallStatus = getOverallStatus();
  const groupNames = Object.keys(groupedIngredients).sort((a, b) => {
    // Sort order: base, packaging, sauce, topping, others
    const order = { base: 1, packaging: 2, sauce: 3, topping: 4 };
    const aOrder = order[a.toLowerCase() as keyof typeof order] || 999;
    const bOrder = order[b.toLowerCase() as keyof typeof order] || 999;
    return aOrder - bOrder;
  });

  return (
    <div className="space-y-6">
      {/* Mix & Match Header */}
      <Card className="border-l-4 border-l-primary bg-gradient-to-r from-primary/5 to-transparent">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Mix & Match Product</h3>
                <Badge variant="secondary" className="text-xs">
                  {product.name || product.product_name}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground max-w-2xl">
                {product.description || "Customers can select from different ingredient groups for customization."}
              </p>
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1">
                  <Package className="w-4 h-4" />
                  {groupNames.length} ingredient groups
                </span>
                <span className="flex items-center gap-1">
                  <Badge variant="outline" className={`${overallStatus.color} text-white border-0`}>
                    {overallStatus.message}
                  </Badge>
                </span>
                <span className="text-muted-foreground">
                  Total Cost: ₱{calculateTotalCost().toFixed(2)}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button onClick={onAutoMap} disabled={isSaving} variant="outline" size="sm">
                <Zap className="w-4 h-4 mr-1" />
                Auto-Map
              </Button>
              <Button onClick={onRefresh} variant="ghost" size="sm">
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Business Rules Alert */}
      <Alert className="border-blue-200 bg-blue-50">
        <AlertTriangle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong>Mix & Match Rules:</strong> Customers select from ingredient choice groups. 
          Base and packaging ingredients are always included, while sauce and topping groups allow customer selection.
          Ensure all customer-selectable options have proper inventory mappings.
        </AlertDescription>
      </Alert>

      {/* Ingredient Groups */}
      <div className="space-y-4">
        {groupNames.map(groupName => {
          const groupInfo = getGroupInfo(groupName);
          if (!groupInfo) return null;

          const isExpanded = expandedGroups.has(groupName);
          
          return (
            <Card key={groupName} className="overflow-hidden">
              <Collapsible open={isExpanded} onOpenChange={() => toggleGroup(groupName)}>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          <span className="text-lg">{getGroupIcon(groupName)}</span>
                          <span className="capitalize font-semibold">{groupName} Ingredients</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {groupInfo.isOptional && (
                            <Badge variant="outline" className="text-xs">
                              Customer Choice
                            </Badge>
                          )}
                          
                          {groupInfo.isComplete ? (
                            <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              All Mapped ({groupInfo.total})
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="bg-amber-100 text-amber-800 border-amber-200">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              {groupInfo.total - groupInfo.mapped} Unmapped
                            </Badge>
                          )}
                          
                          <Badge variant="outline" className="text-xs">
                            ₱{calculateGroupCost(groupName).toFixed(2)}
                          </Badge>
                        </div>
                      </div>
                    </CardTitle>
                    <p className="text-sm text-muted-foreground text-left">
                      {getGroupDescription(groupName, groupInfo.isOptional)}
                    </p>
                  </CardHeader>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <CardContent className="pt-0 pb-6">
                    <IngredientGroupCard
                      groupName={groupName}
                      ingredients={groupInfo.ingredients}
                      inventoryItems={inventoryItems}
                      isOptional={groupInfo.isOptional}
                      isSaving={isSaving}
                      onUpdateMapping={onUpdateMapping}
                      onUpdateQuantity={onUpdateQuantity}
                      onDeleteIngredient={onDeleteIngredient}
                    />
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          );
        })}
      </div>

      {/* Summary Card */}
      <Card className="bg-muted/30">
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="space-y-1">
              <span className="text-muted-foreground">Total Groups:</span>
              <div className="font-medium">{groupNames.length}</div>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground">Total Ingredients:</span>
              <div className="font-medium">{ingredients.length}</div>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground">Mapped:</span>
              <div className="font-medium">
                {ingredients.filter(ing => ing.inventory_stock_id).length}/{ingredients.length}
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground">Total Cost:</span>
              <div className="font-medium text-primary">₱{calculateTotalCost().toFixed(2)}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};