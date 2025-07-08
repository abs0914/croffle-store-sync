import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ChefHat, Package } from "lucide-react";

interface ProductTypeSelectorProps {
  productType: 'recipe' | 'direct' | null;
  onProductTypeChange: (type: 'recipe' | 'direct') => void;
  disabled?: boolean;
}

export const ProductTypeSelector = ({
  productType,
  onProductTypeChange,
  disabled = false
}: ProductTypeSelectorProps) => {
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-base font-semibold">Product Type</Label>
        <p className="text-sm text-muted-foreground mt-1">
          Choose how this product will be managed in your inventory system
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card 
          className={`cursor-pointer transition-all border-2 ${
            productType === 'recipe' 
              ? 'border-primary bg-primary/5' 
              : 'border-border hover:border-primary/50'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          onClick={() => !disabled && onProductTypeChange('recipe')}
        >
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ChefHat className="h-5 w-5" />
              Recipe-based Product
              {productType === 'recipe' && (
                <Badge variant="default" className="ml-auto">Selected</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground">
              Product made from multiple ingredients using recipes. 
              Ingredients are automatically deducted from store inventory when sold.
            </p>
            <div className="mt-3 text-xs text-muted-foreground">
              <p><strong>Best for:</strong> Croffles, prepared foods, custom items</p>
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all border-2 ${
            productType === 'direct' 
              ? 'border-primary bg-primary/5' 
              : 'border-border hover:border-primary/50'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          onClick={() => !disabled && onProductTypeChange('direct')}
        >
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="h-5 w-5" />
              Direct Inventory Product
              {productType === 'direct' && (
                <Badge variant="default" className="ml-auto">Selected</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground">
              Product sold directly from store inventory. 
              Stock is deducted one-to-one when sold.
            </p>
            <div className="mt-3 text-xs text-muted-foreground">
              <p><strong>Best for:</strong> Beverages, bottled water, packaged snacks</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};