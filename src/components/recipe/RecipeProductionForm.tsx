import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  ChefHat, 
  Package, 
  AlertTriangle, 
  CheckCircle2, 
  Calculator,
  Clock
} from 'lucide-react';
import { DirectInventoryIngredient } from '@/services/recipeManagement/directInventoryService';
import { useDirectInventoryRecipe } from '@/hooks/recipe/useDirectInventoryRecipe';

interface RecipeProductionFormProps {
  recipeId: string;
  recipeName: string;
  ingredients: DirectInventoryIngredient[];
  storeId: string;
  onProduced?: (quantity: number) => void;
}

export const RecipeProductionForm: React.FC<RecipeProductionFormProps> = ({
  recipeId,
  recipeName,
  ingredients,
  storeId,
  onProduced
}) => {
  const [productionQuantity, setProductionQuantity] = useState(1);
  const [isProducing, setIsProducing] = useState(false);
  const [availabilityCheck, setAvailabilityCheck] = useState<any>(null);

  const { checkAvailability, useRecipe, totalCost } = useDirectInventoryRecipe(storeId);

  const handleCheckAvailability = async () => {
    const result = await checkAvailability(productionQuantity);
    setAvailabilityCheck(result);
  };

  const handleProduce = async () => {
    setIsProducing(true);
    try {
      const success = await useRecipe(recipeId, productionQuantity);
      if (success) {
        onProduced?.(productionQuantity);
        setProductionQuantity(1);
        setAvailabilityCheck(null);
      }
    } finally {
      setIsProducing(false);
    }
  };

  const totalProductionCost = totalCost * productionQuantity;
  const costPerUnit = totalCost;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ChefHat className="h-5 w-5" />
          Recipe Production - {recipeName}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Production Quantity */}
        <div>
          <Label>Production Quantity</Label>
          <div className="flex items-center gap-4 mt-2">
            <Input
              type="number"
              min="1"
              value={productionQuantity}
              onChange={(e) => setProductionQuantity(parseInt(e.target.value) || 1)}
              className="w-32"
            />
            <Button 
              variant="outline" 
              onClick={handleCheckAvailability}
              disabled={productionQuantity < 1}
            >
              <Package className="h-4 w-4 mr-2" />
              Check Availability
            </Button>
          </div>
        </div>

        {/* Cost Breakdown */}
        <div className="p-4 bg-muted rounded-lg">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Cost per unit:</span>
              <span className="ml-2 font-medium">₱{costPerUnit.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Total cost:</span>
              <span className="ml-2 font-medium">₱{totalProductionCost.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Ingredients Required */}
        <div>
          <h4 className="font-medium mb-3">Ingredients Required</h4>
          <div className="space-y-2">
            {ingredients.map((ingredient, index) => {
              const requiredQuantity = ingredient.quantity * productionQuantity;
              const isFractional = ingredient.supports_fractional && requiredQuantity % 1 !== 0;
              
              return (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{ingredient.ingredient_name}</span>
                    {ingredient.supports_fractional && (
                      <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                        0.5×
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${isFractional ? 'text-green-600' : ''}`}>
                      {requiredQuantity} {ingredient.unit}
                    </span>
                    {isFractional && (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Availability Check Results */}
        {availabilityCheck && (
          <Alert className={availabilityCheck.available ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
            {availabilityCheck.available ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  All ingredients are available for production of {productionQuantity} units.
                </AlertDescription>
              </>
            ) : (
              <>
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  <div className="mb-2">Insufficient ingredients:</div>
                  <div className="space-y-1">
                    {availabilityCheck.unavailableItems.map((item: any, index: number) => (
                      <div key={index} className="text-sm">
                        • {item.ingredient_name}: Need {item.required}, Have {item.available}
                      </div>
                    ))}
                  </div>
                </AlertDescription>
              </>
            )}
          </Alert>
        )}

        {/* Production Actions */}
        <div className="flex gap-3">
          <Button
            onClick={handleProduce}
            disabled={!availabilityCheck?.available || isProducing || productionQuantity < 1}
            className="flex-1"
          >
            {isProducing ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Producing...
              </>
            ) : (
              <>
                <ChefHat className="h-4 w-4 mr-2" />
                Produce {productionQuantity} units
              </>
            )}
          </Button>

          <Button
            variant="outline"
            onClick={() => {
              setProductionQuantity(1);
              setAvailabilityCheck(null);
            }}
          >
            Reset
          </Button>
        </div>

        {/* Production Tips */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-2">
            <Calculator className="h-4 w-4 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Production Tips:</p>
              <ul className="text-xs space-y-1">
                <li>• Always check availability before production</li>
                <li>• Fractional quantities are supported for Mini Croffle ingredients</li>
                <li>• Inventory will be automatically deducted upon production</li>
                <li>• Cost calculation includes all direct ingredient costs</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};