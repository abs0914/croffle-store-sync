import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  AlertTriangle, 
  RefreshCw, 
  Package,
  AlertCircle 
} from 'lucide-react';

interface RecipeTemplate {
  id: string;
  name: string;
}

interface DirectInventoryIngredient {
  ingredient_name: string;
  quantity: number;
  unit: string;
  inventory_stock_id?: string;
  estimated_cost_per_unit?: number;
  supports_fractional: boolean;
}

interface AvailabilityResults {
  available: boolean;
  unavailableItems: Array<{
    ingredient_name: string;
    required: number;
    available: number;
  }>;
}

interface IngredientAvailabilityCheckProps {
  template: RecipeTemplate;
  quantity: number;
  ingredients: DirectInventoryIngredient[];
  availabilityResults: AvailabilityResults | null;
  onCheck: () => void;
}

export const IngredientAvailabilityCheck: React.FC<IngredientAvailabilityCheckProps> = ({
  template,
  quantity,
  ingredients,
  availabilityResults,
  onCheck
}) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Ingredient Availability Check
          </CardTitle>
          <Button onClick={onCheck} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Check Availability
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Ingredients List */}
        <div className="space-y-3">
          <div className="text-sm font-medium">Required Ingredients:</div>
          <div className="grid gap-2">
            {ingredients.map((ingredient, index) => {
              const totalRequired = ingredient.quantity * quantity;
              const unavailableItem = availabilityResults?.unavailableItems.find(
                item => item.ingredient_name === ingredient.ingredient_name
              );
              
              const isAvailable = !unavailableItem;
              const availableQuantity = unavailableItem ? unavailableItem.available : null;

              return (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {availabilityResults && (
                      <div className="flex-shrink-0">
                        {isAvailable ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-red-600" />
                        )}
                      </div>
                    )}
                    <div>
                      <div className="font-medium">{ingredient.ingredient_name}</div>
                      <div className="text-sm text-muted-foreground">
                        Required: {totalRequired} {ingredient.unit}
                        {ingredient.supports_fractional && (
                          <Badge variant="secondary" className="ml-2 text-xs">
                            Fractional OK
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    {availabilityResults && (
                      <div className="text-sm">
                        {isAvailable ? (
                          <Badge variant="default" className="bg-green-600">
                            Available
                          </Badge>
                        ) : (
                          <div className="space-y-1">
                            <Badge variant="destructive">
                              Insufficient
                            </Badge>
                            <div className="text-xs text-red-600">
                              Have: {availableQuantity} {ingredient.unit}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Availability Results */}
        {availabilityResults && (
          <div className="space-y-3">
            {availabilityResults.available ? (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <strong>All ingredients available!</strong> You can proceed with production.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  <strong>Insufficient ingredients!</strong> The following items need restocking:
                  <ul className="mt-2 space-y-1">
                    {availabilityResults.unavailableItems.map((item, index) => (
                      <li key={index} className="text-sm">
                        • {item.ingredient_name}: Need {item.required}, have {item.available}
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Instructions */}
        {!availabilityResults && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Click "Check Availability" to verify if all ingredients are in stock for production.
              This will check your current inventory levels against the recipe requirements.
            </AlertDescription>
          </Alert>
        )}

        {/* Production Impact Summary */}
        {availabilityResults?.available && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-sm space-y-2">
              <div className="font-medium text-blue-900">Production Impact:</div>
              <div className="text-blue-800">
                • {ingredients.length} ingredients will be deducted from inventory
              </div>
              <div className="text-blue-800">
                • {template.name} will be added to finished goods inventory
              </div>
              <div className="text-blue-800">
                • Production will be logged for tracking and analytics
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};