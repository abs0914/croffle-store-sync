import React from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  AlertTriangle, 
  Package, 
  XCircle,
  Clock
} from 'lucide-react';
import type { RecipeProductStatus } from '@/services/recipeManagement/recipeProductIntegration';

interface RecipeStatusIndicatorProps {
  status: RecipeProductStatus['status'];
  canProduce?: boolean;
  availableIngredients?: number;
  totalIngredients?: number;
  className?: string;
  showDetails?: boolean;
}

const statusConfig = {
  ready_to_sell: {
    label: 'Ready to Sell',
    icon: CheckCircle,
    variant: 'default' as const,
    className: 'bg-green-500/10 text-green-700 border-green-500/20'
  },
  setup_needed: {
    label: 'Setup Needed',
    icon: AlertTriangle,
    variant: 'secondary' as const,
    className: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20'
  },
  direct_product: {
    label: 'Direct Product',
    icon: Package,
    variant: 'outline' as const,
    className: 'bg-blue-500/10 text-blue-700 border-blue-500/20'
  },
  missing_template: {
    label: 'Missing Template',
    icon: XCircle,
    variant: 'destructive' as const,
    className: 'bg-red-500/10 text-red-700 border-red-500/20'
  }
};

export const RecipeStatusIndicator: React.FC<RecipeStatusIndicatorProps> = ({
  status,
  canProduce,
  availableIngredients,
  totalIngredients,
  className = "",
  showDetails = false
}) => {
  const config = statusConfig[status];
  const Icon = config.icon;
  
  const getDetailText = () => {
    if (!showDetails || totalIngredients === 0) return null;
    
    if (status === 'direct_product') {
      return 'No recipe required';
    }
    
    return `${availableIngredients}/${totalIngredients} ingredients available`;
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Badge variant={config.variant} className={`flex items-center gap-1 ${config.className}`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
      {showDetails && getDetailText() && (
        <span className="text-xs text-muted-foreground">
          {getDetailText()}
        </span>
      )}
    </div>
  );
};