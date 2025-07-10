import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Play, 
  CheckCircle, 
  AlertTriangle, 
  Clock,
  DollarSign,
  Package
} from 'lucide-react';

interface RecipeTemplate {
  id: string;
  name: string;
  yield_quantity: number;
  description?: string;
}

interface ProductionConfirmationProps {
  template: RecipeTemplate;
  quantity: number;
  totalCost: number;
  isExecuting: boolean;
  progress: number;
  onExecute: () => void;
}

export const ProductionConfirmation: React.FC<ProductionConfirmationProps> = ({
  template,
  quantity,
  totalCost,
  isExecuting,
  progress,
  onExecute
}) => {
  const totalYield = template.yield_quantity * quantity;
  const costPerServing = totalCost / totalYield;

  const getProgressStage = () => {
    if (progress <= 25) return 'Creating production record...';
    if (progress <= 50) return 'Deducting ingredients from inventory...';
    if (progress <= 75) return 'Adding finished products to inventory...';
    if (progress <= 100) return 'Completing production record...';
    return 'Production complete!';
  };

  return (
    <Card className="border-green-200 bg-green-50/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-green-800">
          <CheckCircle className="h-5 w-5" />
          Ready for Production
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Production Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-white rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Recipe</span>
            </div>
            <div className="text-lg font-semibold">{template.name}</div>
            <div className="text-sm text-muted-foreground">
              {quantity} {quantity === 1 ? 'batch' : 'batches'}
            </div>
          </div>

          <div className="p-4 bg-white rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium">Yield</span>
            </div>
            <div className="text-lg font-semibold">{totalYield}</div>
            <div className="text-sm text-muted-foreground">servings</div>
          </div>

          <div className="p-4 bg-white rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Total Cost</span>
            </div>
            <div className="text-lg font-semibold">₱{totalCost.toFixed(2)}</div>
            <div className="text-sm text-muted-foreground">
              ₱{costPerServing.toFixed(2)} per serving
            </div>
          </div>
        </div>

        {/* Production Steps */}
        <div className="space-y-3">
          <div className="text-sm font-medium">Production Process:</div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-medium">
                1
              </div>
              <span>Create production record and validate ingredients</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-medium">
                2
              </div>
              <span>Deduct required ingredients from inventory</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-medium">
                3
              </div>
              <span>Add finished products to inventory</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-medium">
                4
              </div>
              <span>Log production for tracking and analytics</span>
            </div>
          </div>
        </div>

        {/* Execution Progress */}
        {isExecuting && (
          <div className="space-y-3">
            <div className="text-sm font-medium">Production Progress:</div>
            <Progress value={progress} className="h-2" />
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              {getProgressStage()}
            </div>
          </div>
        )}

        {/* Warning */}
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <strong>Important:</strong> This action will immediately deduct ingredients from your inventory 
            and cannot be undone. Make sure you're ready to proceed with production.
          </AlertDescription>
        </Alert>

        {/* Action Button */}
        <div className="flex justify-center">
          <Button
            onClick={onExecute}
            disabled={isExecuting}
            size="lg"
            className="px-8"
          >
            {isExecuting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Executing Production...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Start Production
              </>
            )}
          </Button>
        </div>

        {/* Completion Message */}
        {progress === 100 && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>Production Complete!</strong> Your finished products have been added to inventory 
              and the production has been logged for tracking.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};