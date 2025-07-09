import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Package, Calculator, ArrowRight } from 'lucide-react';

interface StoreInventoryIntegrationSummaryProps {
  className?: string;
}

export const StoreInventoryIntegrationSummary: React.FC<StoreInventoryIntegrationSummaryProps> = ({
  className
}) => {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-500" />
          Store Inventory Integration - Complete!
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Package className="h-4 w-4" />
              What's New
            </h4>
            <ul className="text-sm space-y-2">
              <li className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">✓</Badge>
                Recipe templates can now use store inventory items
              </li>
              <li className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">✓</Badge>
                Conversion factors for bulk-to-recipe units (e.g., 1 pack = 20 pieces)
              </li>
              <li className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">✓</Badge>
                Auto-populated costs from store inventory
              </li>
              <li className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">✓</Badge>
                Support for both commissary and store inventory sources
              </li>
            </ul>
          </div>
          
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              How It Works
            </h4>
            <div className="text-sm space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Store has:</span>
                <Badge variant="outline">Pack of 20 Nutella - ₱100</Badge>
              </div>
              <ArrowRight className="h-4 w-4 mx-auto text-muted-foreground" />
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Recipe needs:</span>
                <Badge variant="outline">1 piece Nutella - ₱5</Badge>
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                System automatically calculates: ₱100 ÷ 20 = ₱5 per piece
              </div>
            </div>
          </div>
        </div>
        
        <div className="pt-4 border-t">
          <h4 className="font-medium mb-2">Next Steps</h4>
          <ol className="text-sm space-y-1 list-decimal list-inside">
            <li>Edit your recipe templates and select "Store Inventory" source</li>
            <li>Choose store inventory items and set conversion factors</li>
            <li>Deploy templates to stores for proper inventory deduction</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
};