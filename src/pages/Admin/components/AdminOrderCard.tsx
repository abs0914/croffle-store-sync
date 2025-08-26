
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ShoppingBag, User, Building2, CreditCard, Calendar, MoreVertical, Package } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Store } from '@/types';

interface AdminOrder {
  id: string;
  orderNumber: string;
  storeId: string;
  storeName?: string;
  customerId?: string;
  customerName?: string;
  status: string;
  total: number;
  itemCount: number;
  paymentMethod: string;
  createdAt: string;
  items: any[];
}

interface AdminOrderCardProps {
  order: AdminOrder;
  isSelected: boolean;
  onSelect: () => void;
  stores: Store[];
}

export const AdminOrderCard: React.FC<AdminOrderCardProps> = ({
  order,
  isSelected,
  onSelect,
  stores
}) => {
  const store = stores.find(s => s.id === order.storeId);
  const statusColor = order.status === 'completed' ? 'default' : 
                     order.status === 'pending' ? 'secondary' : 'destructive';

  return (
    <Card className={`transition-all ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:shadow-md'}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={isSelected}
              onCheckedChange={onSelect}
              onClick={(e) => e.stopPropagation()}
            />
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-gray-600" />
              <CardTitle className="text-lg">{order.orderNumber}</CardTitle>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>View Details</DropdownMenuItem>
              <DropdownMenuItem>Print Receipt</DropdownMenuItem>
              <DropdownMenuItem>Void Order</DropdownMenuItem>
              <DropdownMenuItem>Contact Customer</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <div className="flex items-center gap-2 mt-2">
          <Badge variant={statusColor}>
            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
          </Badge>
          <Badge variant="outline">
            {order.paymentMethod.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div className="space-y-2">
          {order.customerName && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <User className="h-3 w-3" />
              <span>{order.customerName}</span>
            </div>
          )}
          {store && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Building2 className="h-3 w-3" />
              <span>{store.name}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Package className="h-3 w-3" />
            <span>{order.itemCount} item{order.itemCount !== 1 ? 's' : ''}</span>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 pt-3 border-t">
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-1">Total</div>
            <div className="text-lg font-semibold">₱{order.total.toFixed(2)}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-1">Payment</div>
            <div className="text-sm font-medium">{order.paymentMethod}</div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-xs text-gray-500 pt-2 border-t">
          <Calendar className="h-3 w-3" />
          <span>{new Date(order.createdAt).toLocaleString()}</span>
        </div>
      </CardContent>
    </Card>
  );
};
