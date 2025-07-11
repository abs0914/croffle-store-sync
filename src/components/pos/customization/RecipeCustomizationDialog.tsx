import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { ChefHat, Package, Utensils, AlertCircle } from 'lucide-react';
import {
  CustomizableRecipe,
  SelectedChoice,
  validateChoiceSelections,
  calculateCustomizedPrice,
  generateCustomizedDisplayName,
  getBaseIngredients,
  getPackagingIngredients,
  createCustomizedCartItem
} from '@/services/pos/customizableRecipeService';
import { toast } from 'sonner';

interface RecipeCustomizationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  recipe: CustomizableRecipe | null;
  onAddToCart: (customizedItem: any) => void;
}

export const RecipeCustomizationDialog: React.FC<RecipeCustomizationDialogProps> = ({
  isOpen,
  onClose,
  recipe,
  onAddToCart
}) => {
  const [selectedChoices, setSelectedChoices] = useState<SelectedChoice[]>([]);
  const [isValid, setIsValid] = useState(false);
  const [missingGroups, setMissingGroups] = useState<string[]>([]);

  // Reset selections when recipe changes
  useEffect(() => {
    if (recipe) {
      // Set default selections for required groups
      const defaultChoices: SelectedChoice[] = [];
      
      recipe.choice_groups.forEach(group => {
        if (group.selection_type === 'required_one' && group.ingredients.length > 0) {
          // Select the first ingredient as default
          defaultChoices.push({
            choice_group_name: group.name,
            selected_ingredient: group.ingredients[0]
          });
        }
      });
      
      setSelectedChoices(defaultChoices);
    } else {
      setSelectedChoices([]);
    }
  }, [recipe]);

  // Validate selections whenever they change
  useEffect(() => {
    if (recipe) {
      const validation = validateChoiceSelections(recipe, selectedChoices);
      setIsValid(validation.isValid);
      setMissingGroups(validation.missingGroups);
    }
  }, [recipe, selectedChoices]);

  const handleChoiceSelect = (groupName: string, ingredient: any) => {
    setSelectedChoices(prev => {
      // Remove any existing selection for this group
      const filtered = prev.filter(choice => choice.choice_group_name !== groupName);
      
      // Add the new selection
      return [...filtered, {
        choice_group_name: groupName,
        selected_ingredient: ingredient
      }];
    });
  };

  const handleAddToCart = () => {
    if (!recipe || !isValid) {
      toast.error('Please make all required selections');
      return;
    }

    const customizedItem = createCustomizedCartItem(recipe, selectedChoices, 1);
    
    // Convert to format expected by existing cart system
    const cartItem = {
      id: `${recipe.id}-${Date.now()}`,
      productId: recipe.id,
      product: {
        id: recipe.id,
        name: customizedItem.display_name,
        price: customizedItem.final_price,
        is_active: true,
        stock_quantity: 100, // Assume available
        category: recipe.category_name
      },
      quantity: 1,
      price: customizedItem.final_price,
      customization: {
        recipe_id: recipe.id,
        selected_choices: selectedChoices,
        display_name: customizedItem.display_name
      }
    };

    onAddToCart(cartItem);
    toast.success(`${customizedItem.display_name} added to cart`);
    onClose();
  };

  if (!recipe) return null;

  const baseIngredients = getBaseIngredients(recipe);
  const packagingIngredients = getPackagingIngredients(recipe);
  const finalPrice = calculateCustomizedPrice(recipe, selectedChoices);
  const displayName = generateCustomizedDisplayName(recipe, selectedChoices);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ChefHat className="h-5 w-5" />
            Customize {recipe.name}
          </DialogTitle>
          <DialogDescription>
            {recipe.description || `Customize your ${recipe.name} with your preferred toppings and options.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Base Ingredients */}
          {baseIngredients.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ChefHat className="h-4 w-4" />
                  Base Ingredients (Included)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {baseIngredients.map((ingredient, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span>{ingredient.ingredient_name}</span>
                      <span className="text-muted-foreground">
                        {ingredient.quantity} {ingredient.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Choice Groups */}
          {recipe.choice_groups.map((group, groupIndex) => (
            <Card key={groupIndex}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Utensils className="h-4 w-4" />
                  {group.display_name}
                  {group.selection_type === 'required_one' && (
                    <Badge variant="secondary" className="text-xs">Required</Badge>
                  )}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  {group.selection_type === 'required_one' ? 'Select one option' : 'Optional selection'}
                </p>
              </CardHeader>
              <CardContent>
                <RadioGroup
                  value={selectedChoices.find(choice => choice.choice_group_name === group.name)?.selected_ingredient.id || ''}
                  onValueChange={(value) => {
                    const ingredient = group.ingredients.find(ing => ing.id === value);
                    if (ingredient) {
                      handleChoiceSelect(group.name, ingredient);
                    }
                  }}
                >
                  <div className="grid grid-cols-1 gap-3">
                    {group.ingredients.map((ingredient) => (
                      <div key={ingredient.id} className="flex items-center space-x-3">
                        <RadioGroupItem value={ingredient.id} id={ingredient.id} />
                        <Label 
                          htmlFor={ingredient.id} 
                          className="flex-1 flex justify-between items-center cursor-pointer"
                        >
                          <span>{ingredient.ingredient_name}</span>
                          <span className="text-sm text-muted-foreground">
                            {ingredient.quantity} {ingredient.unit}
                          </span>
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>
          ))}

          {/* Packaging */}
          {packagingIngredients.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Packaging (Included)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {packagingIngredients.map((ingredient, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span>{ingredient.ingredient_name}</span>
                      <span className="text-muted-foreground">
                        {ingredient.quantity} {ingredient.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Validation Errors */}
          {!isValid && missingGroups.length > 0 && (
            <Card className="border-destructive">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">Please make selections for:</span>
                </div>
                <ul className="mt-2 text-sm text-destructive">
                  {missingGroups.map((group, index) => (
                    <li key={index}>• {group}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <Separator />

          {/* Order Summary */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-medium">Your Order:</span>
              <span className="font-bold text-lg">₱{finalPrice.toFixed(2)}</span>
            </div>
            <p className="text-sm text-muted-foreground">{displayName}</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleAddToCart}
            disabled={!isValid}
            className="min-w-[120px]"
          >
            Add to Cart
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
