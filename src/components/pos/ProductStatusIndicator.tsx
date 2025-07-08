import React from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle 
} from 'lucide-react';
import { ProductStatus } from '@/types/product';

interface ProductStatusIndicatorProps {
  status?: ProductStatus;
  isAvailable: boolean;
  className?: string;
  showIcon?: boolean;
}

const statusConfig = {
  available: {
    label: 'Available',
    icon: CheckCircle,
    variant: 'default' as const,
    color: 'text-green-600'
  },
  out_of_stock: {
    label: 'Out of Stock',
    icon: XCircle,
    variant: 'destructive' as const,
    color: 'text-red-600'
  },
  temporarily_unavailable: {
    label: 'Temp. Unavailable',
    icon: Clock,
    variant: 'secondary' as const,
    color: 'text-yellow-600'
  },
  discontinued: {
    label: 'Discontinued',
    icon: AlertTriangle,
    variant: 'outline' as const,
    color: 'text-gray-600'
  }
};

export const ProductStatusIndicator: React.FC<ProductStatusIndicatorProps> = ({
  status,
  isAvailable,
  className = "",
  showIcon = true
}) => {
  // Fallback to determine status from is_available if product_status is not set
  const effectiveStatus = status || (isAvailable ? 'available' : 'out_of_stock');
  const config = statusConfig[effectiveStatus];
  const Icon = config.icon;

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {showIcon && <Icon className={`h-3 w-3 ${config.color}`} />}
      <Badge variant={config.variant} className="text-xs">
        {config.label}
      </Badge>
    </div>
  );
};

export default ProductStatusIndicator;
