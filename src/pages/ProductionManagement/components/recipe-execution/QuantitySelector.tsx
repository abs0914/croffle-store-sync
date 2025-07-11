import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calculator, Plus, Minus } from 'lucide-react';

interface RecipeTemplate {
  id: string;
  name: string;
  yield_quantity: number;
  cost_per_serving?: number;
}

interface QuantitySelectorProps {
  template: RecipeTemplate;
  quantity: number;
  onQuantityChange: (quantity: number) => void;
  totalCost: number;
}

export const QuantitySelector: React.FC<QuantitySelectorProps> = ({
  template,
  quantity,
  onQuantityChange,
  totalCost
}) => {
  const handleIncrement = () => {
    onQuantityChange(quantity + 1);
  };

  const handleDecrement = () => {
    if (quantity > 1) {
      onQuantityChange(quantity - 1);
    }
  };

  const handleInputChange = (value: string) => {
    const num = parseInt(value);
    if (!isNaN(num) && num > 0) {
      onQuantityChange(num);
    }
  };

  const totalYield = template.yield_quantity * quantity;
  const costPerUnit = totalCost / totalYield;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Production Quantity
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quantity Controls */}
        <div className="space-y-2">
          <Label>Number of Recipe Batches</Label>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDecrement}
              disabled={quantity <= 1}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => handleInputChange(e.target.value)}
              className="w-24 text-center"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleIncrement}
            >
              <Plus className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              {quantity === 1 ? 'batch' : 'batches'}
            </span>
          </div>
        </div>

        {/* Production Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Recipe</Label>
            <div className="font-semibold">{template.name}</div>
          </div>
          
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Total Yield</Label>
            <div className="font-semibold flex items-center gap-2">
              {totalYield}
              <Badge variant="secondary" className="text-xs">
                servings
              </Badge>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Total Cost</Label>
            <div className="font-semibold text-lg">₱{totalCost.toFixed(2)}</div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Cost per Serving</Label>
            <div className="font-semibold">₱{costPerUnit.toFixed(2)}</div>
          </div>
        </div>

        {/* Quick Quantity Presets */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Quick Select</Label>
          <div className="flex gap-2">
            {[1, 2, 5, 10].map(preset => (
              <Button
                key={preset}
                variant={quantity === preset ? "default" : "outline"}
                size="sm"
                onClick={() => onQuantityChange(preset)}
              >
                {preset}x
              </Button>
            ))}
          </div>
        </div>

        {/* Production Preview */}
        <div className="p-4 bg-muted/50 rounded-lg">
          <div className="text-sm space-y-2">
            <div className="font-medium">Production Preview:</div>
            <div className="flex justify-between">
              <span>Batches to produce:</span>
              <span className="font-medium">{quantity}</span>
            </div>
            <div className="flex justify-between">
              <span>Finished products yield:</span>
              <span className="font-medium">{totalYield} servings</span>
            </div>
            <div className="flex justify-between">
              <span>Estimated production time:</span>
              <span className="font-medium">{(quantity * 15).toFixed(0)} minutes</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-semibold">
              <span>Total investment:</span>
              <span>₱{totalCost.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};