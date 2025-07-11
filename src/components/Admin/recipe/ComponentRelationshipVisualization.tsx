import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  ArrowRight, 
  Package, 
  Layers, 
  Component,
  DollarSign,
  Clock,
  Users
} from 'lucide-react';
import { UnifiedRecipeItem } from '@/hooks/admin/useUnifiedRecipeState';

interface ComponentRelationshipVisualizationProps {
  recipe: UnifiedRecipeItem;
  availableComponents?: UnifiedRecipeItem[];
  onEditComponent?: (componentId: string) => void;
}

export function ComponentRelationshipVisualization({
  recipe,
  availableComponents = [],
  onEditComponent
}: ComponentRelationshipVisualizationProps) {
  if (recipe.recipe_type !== 'combo') {
    return null;
  }

  const comboRules = recipe.combo_rules;
  const pricingMatrix = comboRules?.pricing_matrix || [];

  // Extract component relationships
  const componentRelationships = pricingMatrix.map(matrix => {
    const primaryComponent = availableComponents.find(c => c.id === matrix.primary_component);
    const secondaryComponent = availableComponents.find(c => c.id === matrix.secondary_component);
    
    return {
      primary: primaryComponent,
      secondary: secondaryComponent,
      price: matrix.price,
      isValid: primaryComponent && secondaryComponent
    };
  });

  const totalComboValue = pricingMatrix.reduce((sum, matrix) => sum + (matrix.price || 0), 0);
  const avgComponentCost = totalComboValue / Math.max(pricingMatrix.length, 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layers className="h-5 w-5" />
          Component Relationships
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Combo Overview */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground mb-1">
              <Package className="h-4 w-4" />
              Components
            </div>
            <div className="text-lg font-semibold">{pricingMatrix.length}</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" />
              Total Value
            </div>
            <div className="text-lg font-semibold">₱{totalComboValue.toFixed(2)}</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground mb-1">
              <Users className="h-4 w-4" />
              Avg Cost
            </div>
            <div className="text-lg font-semibold">₱{avgComponentCost.toFixed(2)}</div>
          </div>
        </div>

        {/* Component Flow Diagram */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm text-muted-foreground">Component Flow</h4>
          
          {componentRelationships.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Layers className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No component relationships configured</p>
              <p className="text-sm">Add components to see the relationship diagram</p>
            </div>
          ) : (
            <div className="space-y-3">
              {componentRelationships.map((relationship, index) => (
                <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                  {/* Primary Component */}
                  <div className="flex-1">
                    {relationship.primary ? (
                      <div className="flex items-center gap-2">
                        <Component className="h-4 w-4 text-blue-600" />
                        <div>
                          <div className="font-medium text-sm">{relationship.primary.name}</div>
                          <div className="text-xs text-muted-foreground">
                            Cost: ₱{relationship.primary.cost_per_serving.toFixed(2)}
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">Primary</Badge>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Component className="h-4 w-4" />
                        <span className="text-sm">Unknown Component</span>
                      </div>
                    )}
                  </div>

                  {/* Connection Arrow */}
                  <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />

                  {/* Secondary Component */}
                  <div className="flex-1">
                    {relationship.secondary ? (
                      <div className="flex items-center gap-2">
                        <Component className="h-4 w-4 text-green-600" />
                        <div>
                          <div className="font-medium text-sm">{relationship.secondary.name}</div>
                          <div className="text-xs text-muted-foreground">
                            Cost: ₱{relationship.secondary.cost_per_serving.toFixed(2)}
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-xs">Secondary</Badge>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Component className="h-4 w-4" />
                        <span className="text-sm">Unknown Component</span>
                      </div>
                    )}
                  </div>

                  {/* Combo Price */}
                  <div className="flex-shrink-0 text-right">
                    <div className="text-sm font-medium">₱{relationship.price.toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground">Combo Price</div>
                  </div>

                  {/* Edit Action */}
                  {onEditComponent && relationship.isValid && (
                    <div className="flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          // Could edit either component - for now, edit primary
                          if (relationship.primary) {
                            onEditComponent(relationship.primary.id);
                          }
                        }}
                      >
                        Edit
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Component Performance Metrics */}
        {componentRelationships.filter(r => r.isValid).length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground">Performance Metrics</h4>
            <div className="grid grid-cols-2 gap-4">
              {componentRelationships
                .filter(r => r.isValid)
                .map((relationship, index) => {
                  const margin = relationship.price - 
                    (relationship.primary!.cost_per_serving + relationship.secondary!.cost_per_serving);
                  const marginPercent = relationship.price > 0 ? (margin / relationship.price) * 100 : 0;
                  
                  return (
                    <div key={index} className="p-3 border rounded-lg">
                      <div className="text-sm font-medium mb-2">
                        {relationship.primary!.name} + {relationship.secondary!.name}
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Profit Margin:</span>
                          <span className={`font-medium ${
                            marginPercent > 30 ? 'text-green-600' : 
                            marginPercent > 15 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {marginPercent.toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Profit Amount:</span>
                          <span className="font-medium">₱{margin.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}