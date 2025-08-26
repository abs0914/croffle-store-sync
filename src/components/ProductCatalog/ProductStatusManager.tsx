import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  ChevronDown 
} from 'lucide-react';
import { ProductStatus } from '@/services/productCatalog/types';

interface ProductStatusManagerProps {
  currentStatus: ProductStatus;
  isAvailable: boolean;
  onStatusChange: (status: ProductStatus, isAvailable: boolean) => void;
  disabled?: boolean;
}

const statusConfig = {
  available: {
    label: 'Available',
    icon: CheckCircle,
    variant: 'default' as const,
    color: 'text-green-600',
    isAvailable: true
  },
  out_of_stock: {
    label: 'Out of Stock',
    icon: XCircle,
    variant: 'destructive' as const,
    color: 'text-red-600',
    isAvailable: false
  },
  temporarily_unavailable: {
    label: 'Temporarily Unavailable',
    icon: Clock,
    variant: 'secondary' as const,
    color: 'text-yellow-600',
    isAvailable: false
  },
  discontinued: {
    label: 'Discontinued',
    icon: AlertTriangle,
    variant: 'outline' as const,
    color: 'text-gray-600',
    isAvailable: false
  }
};

export const ProductStatusManager: React.FC<ProductStatusManagerProps> = ({
  currentStatus,
  isAvailable,
  onStatusChange,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  
  // Fallback to determine status from is_available if product_status is not set
  const effectiveStatus = currentStatus || (isAvailable ? 'available' : 'out_of_stock');
  const config = statusConfig[effectiveStatus];
  const Icon = config.icon;

  const handleStatusChange = (newStatus: ProductStatus) => {
    const newConfig = statusConfig[newStatus];
    onStatusChange(newStatus, newConfig.isAvailable);
    setIsOpen(false);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled}
          className="h-auto p-1 hover:bg-gray-100"
        >
          <div className="flex items-center gap-2">
            <Icon className={`h-4 w-4 ${config.color}`} />
            <Badge variant={config.variant} className="text-xs">
              {config.label}
            </Badge>
            <ChevronDown className="h-3 w-3 text-gray-400" />
          </div>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="start" className="w-56">
        {Object.entries(statusConfig).map(([status, statusConfig]) => {
          const StatusIcon = statusConfig.icon;
          const isSelected = status === effectiveStatus;
          
          return (
            <DropdownMenuItem
              key={status}
              onClick={() => handleStatusChange(status as ProductStatus)}
              className={`flex items-center gap-2 ${isSelected ? 'bg-gray-100' : ''}`}
            >
              <StatusIcon className={`h-4 w-4 ${statusConfig.color}`} />
              <span className="flex-1">{statusConfig.label}</span>
              {isSelected && <CheckCircle className="h-3 w-3 text-green-600" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export const getProductStatusBadge = (status: ProductStatus | undefined, isAvailable: boolean) => {
  const effectiveStatus = status || (isAvailable ? 'available' : 'out_of_stock');
  const config = statusConfig[effectiveStatus];
  const Icon = config.icon;
  
  return (
    <div className="flex items-center gap-1">
      <Icon className={`h-3 w-3 ${config.color}`} />
      <Badge variant={config.variant} className="text-xs">
        {config.label}
      </Badge>
    </div>
  );
};

export default ProductStatusManager;
