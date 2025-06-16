import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, ChefHat, Package } from "lucide-react";
import { getRecipeIngredientAlerts } from "@/services/pos/recipeInventoryService";

interface RecipeIngredientAlertsProps {
  storeId: string;
  className?: string;
}

interface IngredientAlert {
  item_name: string;
  current_stock: number;
  low_stock_threshold: number;
  affected_recipes: string[];
}

export function RecipeIngredientAlerts({ storeId, className }: RecipeIngredientAlertsProps) {
  const [alerts, setAlerts] = useState<IngredientAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAlerts = async () => {
      if (!storeId) return;
      
      setLoading(true);
      try {
        const alertData = await getRecipeIngredientAlerts(storeId);
        setAlerts(alertData);
      } catch (error) {
        console.error('Error loading recipe ingredient alerts:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAlerts();
  }, [storeId]);

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Recipe Ingredient Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (alerts.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-green-500" />
            Recipe Ingredient Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Package className="h-12 w-12 mx-auto text-green-500 mb-3" />
            <p className="text-sm text-muted-foreground">
              All recipe ingredients are well stocked
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const criticalAlerts = alerts.filter(alert => alert.current_stock === 0);
  const lowStockAlerts = alerts.filter(alert => alert.current_stock > 0);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          Recipe Ingredient Alerts
          <Badge variant="destructive" className="ml-auto">
            {alerts.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Critical Alerts - Out of Stock */}
        {criticalAlerts.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-red-600 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Out of Stock ({criticalAlerts.length})
            </h4>
            {criticalAlerts.map((alert, index) => (
              <Alert key={index} variant="destructive">
                <AlertDescription>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{alert.item_name}</span>
                      <Badge variant="destructive">Out of Stock</Badge>
                    </div>
                    <div className="text-sm">
                      <p>Low stock threshold: {alert.low_stock_threshold}</p>
                      {alert.affected_recipes.length > 0 && (
                        <div className="mt-2">
                          <p className="font-medium flex items-center gap-1">
                            <ChefHat className="h-3 w-3" />
                            Affected Recipes:
                          </p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {alert.affected_recipes.map((recipe, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {recipe}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {/* Low Stock Alerts */}
        {lowStockAlerts.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-orange-600 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Low Stock ({lowStockAlerts.length})
            </h4>
            {lowStockAlerts.map((alert, index) => (
              <Alert key={index} className="border-orange-200 bg-orange-50">
                <AlertDescription>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{alert.item_name}</span>
                      <Badge variant="outline" className="border-orange-300 text-orange-700">
                        {alert.current_stock} remaining
                      </Badge>
                    </div>
                    <div className="text-sm text-orange-700">
                      <div className="flex justify-between">
                        <span>Current: {alert.current_stock}</span>
                        <span>Threshold: {alert.low_stock_threshold}</span>
                      </div>
                      <div className="w-full bg-orange-200 rounded-full h-2 mt-1">
                        <div
                          className="bg-orange-500 h-2 rounded-full"
                          style={{
                            width: `${Math.min(100, (alert.current_stock / alert.low_stock_threshold) * 100)}%`
                          }}
                        ></div>
                      </div>
                      {alert.affected_recipes.length > 0 && (
                        <div className="mt-2">
                          <p className="font-medium flex items-center gap-1">
                            <ChefHat className="h-3 w-3" />
                            Affected Recipes:
                          </p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {alert.affected_recipes.map((recipe, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs border-orange-300">
                                {recipe}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {/* Summary */}
        <div className="pt-3 border-t">
          <p className="text-xs text-muted-foreground">
            {criticalAlerts.length > 0 && (
              <span className="text-red-600 font-medium">
                {criticalAlerts.length} ingredient{criticalAlerts.length !== 1 ? 's' : ''} out of stock. 
              </span>
            )}
            {lowStockAlerts.length > 0 && (
              <span className="text-orange-600 font-medium">
                {criticalAlerts.length > 0 ? ' ' : ''}
                {lowStockAlerts.length} ingredient{lowStockAlerts.length !== 1 ? 's' : ''} running low.
              </span>
            )}
            {' '}Recipe production may be affected.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
