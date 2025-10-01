import React, { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Coffee, Zap } from 'lucide-react';
import { Product } from '@/types/product';
import { useMemoizedCategorySearch } from '@/hooks/pos/useMemoizedCategorySearch';

interface ComboSelectionDialogProps {
  open: boolean;
  onClose: () => void;
  product: Product | null;
  onSelectStandalone: () => void;
  onSelectCombo: (espressoType: 'hot' | 'cold') => void;
  products?: Product[];
  categories?: any[];
}

export const ComboSelectionDialog = React.memo<ComboSelectionDialogProps>(({
  open,
  onClose,
  product,
  onSelectStandalone,
  onSelectCombo,
  products = [],
  categories = [],
}) => {
  // Use memoized category search for performance
  const { getCategoryName } = useMemoizedCategorySearch({ 
    products, 
    categories 
  });
  const handleStandalone = () => {
    onSelectStandalone();
    onClose();
  };

  const handleCombo = (espressoType: 'hot' | 'cold') => {
    onSelectCombo(espressoType);
    onClose();
  };

  // Don't render if product is null
  if (!product) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coffee className="h-5 w-5" />
            Choose Your {product.name} Option
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-3 pt-4">
          {/* Standalone Option */}
          <Button
            variant="outline"
            size="lg"
            className="w-full h-auto p-4 flex-col gap-2 hover:bg-muted/50"
            onClick={handleStandalone}
          >
            <div className="flex items-center justify-between w-full">
              <span className="font-medium">Standalone {product.name}</span>
              <span className="text-lg font-bold text-primary">₱{product.price}</span>
            </div>
            <div className="text-sm text-muted-foreground">
              Just the delicious {product.name}
            </div>
          </Button>

          {/* Hot Espresso Combo */}
          <Button
            variant="outline"
            size="lg"
            className="w-full h-auto p-4 flex-col gap-2 hover:bg-muted/50"
            onClick={() => handleCombo('hot')}
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <Coffee className="h-4 w-4" />
                <span className="font-medium">{product.name} + Hot Espresso</span>
              </div>
              <span className="text-lg font-bold text-primary">₱110</span>
            </div>
            <div className="text-sm text-muted-foreground">
              Perfect combo with hot espresso
            </div>
            <div className="text-xs text-green-600">
              Save ₱20 vs buying separately!
            </div>
          </Button>

          {/* Iced Espresso Combo */}
          <Button
            variant="outline"
            size="lg"
            className="w-full h-auto p-4 flex-col gap-2 hover:bg-muted/50"
            onClick={() => handleCombo('cold')}
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                <span className="font-medium">{product.name} + Iced Espresso</span>
              </div>
              <span className="text-lg font-bold text-primary">₱115</span>
            </div>
            <div className="text-sm text-muted-foreground">
              Refreshing combo with iced espresso
            </div>
            <div className="text-xs text-green-600">
              Save ₱15 vs buying separately!
            </div>
          </Button>
        </div>

        <div className="pt-4 border-t">
          <Button variant="ghost" onClick={onClose} className="w-full">
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
});

export default ComboSelectionDialog;