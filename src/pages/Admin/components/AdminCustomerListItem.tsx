import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { User, Mail, Phone, Building2, ShoppingBag, DollarSign, Calendar, MoreVertical } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Store } from '@/types';
import { CustomerWithStats } from '../types/adminTypes';

interface AdminCustomerListItemProps {
  customer: CustomerWithStats;
  isSelected: boolean;
  onSelect: () => void;
  stores: Store[];
}

export const AdminCustomerListItem: React.FC<AdminCustomerListItemProps> = ({
  customer,
  isSelected,
  onSelect,
  stores
}) => {
  const store = stores.find(s => s.id === customer.storeId);
  const isActive = customer.lastOrderDate && 
    new Date(customer.lastOrderDate) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

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
              <User className="h-5 w-5 text-gray-600" />
              <div>
                <h3 className="font-semibold">{customer.name}</h3>
                <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                  {customer.email && (
                    <div className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      <span>{customer.email}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    <span>{customer.phone}</span>
                  </div>
                  {store && (
                    <div className="flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      <span>{store.name}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                <ShoppingBag className="h-3 w-3" />
                <span>Orders</span>
              </div>
              <div className="text-sm font-semibold">{customer.totalOrders}</div>
            </div>
            
            <div className="text-center">
              <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                <DollarSign className="h-3 w-3" />
                <span>Spent</span>
              </div>
              <div className="text-sm font-semibold">₱{customer.totalSpent.toFixed(2)}</div>
            </div>
            
            <div className="text-center min-w-[100px]">
              {customer.lastOrderDate ? (
                <>
                  <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                    <Calendar className="h-3 w-3" />
                    <span>Last Order</span>
                  </div>
                  <div className="text-sm">
                    {new Date(customer.lastOrderDate).toLocaleDateString()}
                  </div>
                </>
              ) : (
                <div className="text-xs text-gray-500">No orders</div>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              <Badge variant={isActive ? 'default' : 'secondary'}>
                {isActive ? 'Active' : 'Inactive'}
              </Badge>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>View Details</DropdownMenuItem>
                  <DropdownMenuItem>Edit Customer</DropdownMenuItem>
                  <DropdownMenuItem>View Orders</DropdownMenuItem>
                  <DropdownMenuItem>Send Message</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
