
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Plus, MapPin, Globe, Calculator, Users } from 'lucide-react';
import { RecipeTemplateIngredientInput, LOCATION_TYPES, LocationType } from '@/services/recipeManagement/types';
import { IngredientFormRedesigned } from './IngredientFormRedesigned';

interface LocationBasedIngredientsProps {
  ingredients: RecipeTemplateIngredientInput[];
  setIngredients: React.Dispatch<React.SetStateAction<RecipeTemplateIngredientInput[]>>;
}

export const LocationBasedIngredients: React.FC<LocationBasedIngredientsProps> = ({
  ingredients,
  setIngredients
}) => {
  console.log('🔥 LocationBasedIngredients RENDERING with NEW REDESIGNED UI');
  const [activeLocationTab, setActiveLocationTab] = useState<LocationType>('all');
  const [ingredientGroups, setIngredientGroups] = useState<Array<{id: string; name: string; type: 'required_one' | 'optional_one' | 'multiple'}>>([]);

  // Initialize groups from existing ingredients
  useEffect(() => {
    const existingGroups = new Map();
    ingredients.forEach(ingredient => {
      if (ingredient.ingredient_group_id && ingredient.ingredient_group_name && ingredient.group_selection_type) {
        existingGroups.set(ingredient.ingredient_group_id, {
          id: ingredient.ingredient_group_id,
          name: ingredient.ingredient_group_name,
          type: ingredient.group_selection_type
        });
      }
    });
    setIngredientGroups(Array.from(existingGroups.values()));
  }, [ingredients]);

  // Group ingredients by location type
  const ingredientsByLocation = ingredients.reduce((acc, ingredient) => {
    const location = ingredient.location_type || 'all';
    if (!acc[location]) {
      acc[location] = [];
    }
    acc[location].push(ingredient);
    return acc;
  }, {} as Record<LocationType, RecipeTemplateIngredientInput[]>);

  // Get ingredients for current tab
  const currentIngredients = ingredientsByLocation[activeLocationTab] || [];

  // Calculate estimated total cost for current location
  const calculateLocationCost = (locationIngredients: RecipeTemplateIngredientInput[]) => {
    return locationIngredients.reduce((total, ingredient) => {
      return total + (ingredient.estimated_cost_per_unit || 0) * ingredient.quantity;
    }, 0);
  };

  const addIngredient = (locationType: LocationType) => {
    const newIngredient: RecipeTemplateIngredientInput = {
      ingredient_name: '',
      quantity: 1,
      unit: 'g',
      estimated_cost_per_unit: 0,
      location_type: locationType
    };
    setIngredients(prev => [...prev, newIngredient]);
  };

  const createIngredientGroup = (groupName: string, selectionType: 'required_one' | 'optional_one' | 'multiple'): string => {
    const groupId = `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newGroup = {
      id: groupId,
      name: groupName,
      type: selectionType
    };
    
    setIngredientGroups(prev => [...prev, newGroup]);
    return groupId;
  };

  const updateIngredient = (index: number, field: keyof RecipeTemplateIngredientInput, value: any) => {
    const globalIndex = ingredients.findIndex((ing, i) => 
      ing.location_type === activeLocationTab && 
      currentIngredients.indexOf(ing) === index
    );
    
    if (globalIndex !== -1) {
      const updated = [...ingredients];
      updated[globalIndex] = { ...updated[globalIndex], [field]: value };
      setIngredients(updated);
    }
  };

  const removeIngredient = (index: number) => {
    const globalIndex = ingredients.findIndex((ing, i) => 
      ing.location_type === activeLocationTab && 
      currentIngredients.indexOf(ing) === index
    );
    
    if (globalIndex !== -1) {
      setIngredients(prev => prev.filter((_, i) => i !== globalIndex));
    }
  };

  const getLocationIcon = (locationType: LocationType) => {
    switch (locationType) {
      case 'inside_cebu': return <MapPin className="h-4 w-4" />;
      case 'outside_cebu': return <MapPin className="h-4 w-4" />;
      default: return <Globe className="h-4 w-4" />;
    }
  };

  const getLocationColor = (locationType: LocationType) => {
    switch (locationType) {
      case 'inside_cebu': return 'bg-blue-500';
      case 'outside_cebu': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  // Group ingredients by location type and then by group
  const groupIngredientsByLocationAndGroup = (locationIngredients: RecipeTemplateIngredientInput[]) => {
    const grouped = locationIngredients.reduce((acc, ingredient, index) => {
      const groupId = ingredient.ingredient_group_id || 'individual';
      const groupName = ingredient.ingredient_group_name || 'Individual Ingredients';
      
      if (!acc[groupId]) {
        acc[groupId] = {
          groupName,
          groupType: ingredient.group_selection_type,
          ingredients: []
        };
      }
      acc[groupId].ingredients.push({ ingredient, index });
      return acc;
    }, {} as Record<string, {groupName: string; groupType?: string; ingredients: Array<{ingredient: RecipeTemplateIngredientInput; index: number}>}>);
    
    return grouped;
  };

  // Check which location types have ingredients
  const usedLocationTypes = LOCATION_TYPES.filter(locType => 
    ingredientsByLocation[locType.value]?.length > 0
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Location-Based Ingredients with Groups
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Configure different ingredients for stores in different locations. Create groups like "Choose 1 Sauce" 
          for customizable products.
        </p>
      </CardHeader>
      
      <CardContent>
        <Tabs value={activeLocationTab} onValueChange={(value) => setActiveLocationTab(value as LocationType)}>
          <div className="flex items-center justify-between mb-4">
            <TabsList className="grid grid-cols-3 w-full max-w-md">
              {LOCATION_TYPES.map(locType => (
                <TabsTrigger 
                  key={locType.value} 
                  value={locType.value}
                  className="flex items-center gap-1"
                >
                  {getLocationIcon(locType.value)}
                  <span className="hidden sm:inline">{locType.label}</span>
                  {ingredientsByLocation[locType.value]?.length > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {ingredientsByLocation[locType.value].length}
                    </Badge>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
            
            <Button
              type="button"
              onClick={() => addIngredient(activeLocationTab)}
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Ingredient
            </Button>
          </div>

          {LOCATION_TYPES.map(locType => (
            <TabsContent key={locType.value} value={locType.value} className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${getLocationColor(locType.value)}`} />
                  <h3 className="font-medium">{locType.label} Ingredients</h3>
                </div>
                
                {ingredientsByLocation[locType.value]?.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calculator className="h-4 w-4" />
                    <span>Est. Cost: ₱{calculateLocationCost(ingredientsByLocation[locType.value]).toFixed(2)}</span>
                  </div>
                )}
              </div>

              {locType.value === activeLocationTab && (
                <>
                  {currentIngredients.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No ingredients configured for {locType.label.toLowerCase()}</p>
                      <p className="text-sm">Add ingredients specific to this location type</p>
                    </div>
                  )}

                   {/* Render grouped ingredients with scrollable container */}
                   <div className="max-h-[50vh] overflow-y-auto space-y-6 pr-2">
                     {Object.entries(groupIngredientsByLocationAndGroup(currentIngredients)).map(([groupId, group]) => (
                       <div key={groupId} className="space-y-4">
                         {groupId !== 'individual' && (
                           <div className="flex items-center gap-2 mb-3 sticky top-0 bg-background/95 backdrop-blur-sm py-2 border-b">
                             <Users className="h-4 w-4 text-primary" />
                             <h4 className="font-medium text-primary">{group.groupName}</h4>
                             <Badge variant="secondary" className="text-xs">
                               {group.groupType?.replace('_', ' ') || 'group'}
                             </Badge>
                           </div>
                         )}
                         
                         <div className="space-y-6">
                            {group.ingredients.map(({ ingredient, index }) => (
                              <IngredientFormRedesigned
                                key={`redesigned-v2-${activeLocationTab}-${index}-${Date.now()}`}
                                ingredient={ingredient}
                                index={index}
                                onUpdate={updateIngredient}
                                onRemove={removeIngredient}
                                showLocationBadge={true}
                                locationColor={getLocationColor(ingredient.location_type)}
                                onCreateGroup={createIngredientGroup}
                                availableGroups={ingredientGroups}
                              />
                            ))}
                         </div>
                       </div>
                     ))}
                   </div>
                </>
              )}
            </TabsContent>
          ))}
        </Tabs>

        {/* Location Summary */}
        {usedLocationTypes.length > 1 && (
          <div className="mt-6 p-4 border rounded-lg bg-muted/50">
            <h4 className="font-medium mb-3">Location Summary</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {usedLocationTypes.map(locType => (
                <div key={locType.value} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${getLocationColor(locType.value)}`} />
                    <span className="text-sm">{locType.label}</span>
                  </div>
                  <div className="text-sm font-medium">
                    {ingredientsByLocation[locType.value]?.length || 0} ingredients
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ingredient Groups Summary */}
        {ingredientGroups.length > 0 && (
          <div className="mt-6 p-4 border rounded-lg bg-blue-50/50">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Ingredient Groups
            </h4>
            <div className="space-y-2">
              {ingredientGroups.map(group => (
                <div key={group.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Users className="h-3 w-3 text-primary" />
                    <span className="font-medium">{group.name}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {group.type.replace('_', ' ')}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
