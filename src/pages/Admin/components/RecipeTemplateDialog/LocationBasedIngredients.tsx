
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Plus, MapPin, Globe, Calculator } from 'lucide-react';
import { RecipeTemplateIngredientInput, LOCATION_TYPES, LocationType } from '@/services/recipeManagement/types';
import { IngredientForm } from './IngredientForm';

interface LocationBasedIngredientsProps {
  ingredients: RecipeTemplateIngredientInput[];
  setIngredients: React.Dispatch<React.SetStateAction<RecipeTemplateIngredientInput[]>>;
}

export const LocationBasedIngredients: React.FC<LocationBasedIngredientsProps> = ({
  ingredients,
  setIngredients
}) => {
  const [activeLocationTab, setActiveLocationTab] = useState<LocationType>('all');

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

  // Calculate total cost for current location
  const calculateLocationCost = (locationIngredients: RecipeTemplateIngredientInput[]) => {
    return locationIngredients.reduce((total, ingredient) => {
      return total + (ingredient.cost_per_unit || 0) * ingredient.quantity;
    }, 0);
  };

  const addIngredient = (locationType: LocationType) => {
    const newIngredient: RecipeTemplateIngredientInput = {
      ingredient_name: '',
      quantity: 1,
      unit: 'g',
      cost_per_unit: 0,
      location_type: locationType
    };
    setIngredients(prev => [...prev, newIngredient]);
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

  // Check which location types have ingredients
  const usedLocationTypes = LOCATION_TYPES.filter(locType => 
    ingredientsByLocation[locType.value]?.length > 0
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Location-Based Ingredients
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Configure different ingredients for stores in different locations. This allows you to handle 
          regional supply chain variations (e.g., pre-mixed vs separate ingredients).
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
                    <span>Total Cost: ₱{calculateLocationCost(ingredientsByLocation[locType.value]).toFixed(2)}</span>
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

                  {currentIngredients.map((ingredient, index) => (
                    <IngredientForm
                      key={`${activeLocationTab}-${index}`}
                      ingredient={ingredient}
                      index={index}
                      onUpdate={updateIngredient}
                      onRemove={removeIngredient}
                      showLocationBadge={true}
                      locationColor={getLocationColor(ingredient.location_type)}
                    />
                  ))}
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
      </CardContent>
    </Card>
  );
};
