
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
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

interface AdminOrderListItemProps {
  order: AdminOrder;
  isSelected: boolean;
  onSelect: () => void;
  stores: Store[];
}

export const AdminOrderListItem: React.FC<AdminOrderListItemProps> = ({
  order,
  isSelected,
  onSelect,
  stores
}) => {
  const store = stores.find(s => s.id === order.storeId);
  const statusColor = order.status === 'completed' ? 'default' : 
                     order.status === 'pending' ? 'secondary' : 'destructive';

  return (
    <Card className={`transition-all ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:shadow-sm'}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <Checkbox
              checked={isSelected}
              onCheckedChange={onSelect}
              onClick={(e) => e.stopPropagation()}
            />
            
            <div className="flex items-center gap-3">
              <ShoppingBag className="h-5 w-5 text-gray-600" />
              <div>
                <h3 className="font-semibold">{order.orderNumber}</h3>
                <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                  {order.customerName && (
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <span>{order.customerName}</span>
                    </div>
                  )}
                  {store && (
                    <div className="flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      <span>{store.name}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Package className="h-3 w-3" />
                    <span>{order.itemCount} items</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-xs text-gray-500 mb-1">Total</div>
              <div className="text-lg font-semibold">₱{order.total.toFixed(2)}</div>
            </div>
            
            <div className="text-center min-w-[80px]">
              <div className="text-xs text-gray-500 mb-1">Payment</div>
              <div className="text-sm font-medium">{order.paymentMethod}</div>
            </div>
            
            <div className="text-center min-w-[120px]">
              <div className="text-xs text-gray-500 mb-1">Date</div>
              <div className="text-sm">
                {new Date(order.createdAt).toLocaleDateString()}
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Badge variant={statusColor}>
                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
              </Badge>
              
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
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
