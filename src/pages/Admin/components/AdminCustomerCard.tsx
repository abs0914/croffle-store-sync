
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { User, Mail, Phone, Building2, ShoppingBag, DollarSign, Calendar, MoreVertical } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Store } from '@/types';

interface CustomerWithStats {
  id: string;
  name: string;
  email?: string;
  phone: string;
  storeId?: string;
  storeName?: string;
  address?: string;
  loyaltyPoints: number;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate?: string;
  registrationDate: string;
}

interface AdminCustomerCardProps {
  customer: CustomerWithStats;
  isSelected: boolean;
  onSelect: () => void;
  stores: Store[];
}

export const AdminCustomerCard: React.FC<AdminCustomerCardProps> = ({
  customer,
  isSelected,
  onSelect,
  stores
}) => {
  const store = stores.find(s => s.id === customer.storeId);
  const isActive = customer.lastOrderDate && 
    new Date(customer.lastOrderDate) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

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
              <User className="h-4 w-4 text-gray-600" />
              <CardTitle className="text-lg">{customer.name}</CardTitle>
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
              <DropdownMenuItem>Edit Customer</DropdownMenuItem>
              <DropdownMenuItem>View Orders</DropdownMenuItem>
              <DropdownMenuItem>Send Message</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <div className="flex items-center gap-2 mt-2">
          <Badge variant={isActive ? 'default' : 'secondary'}>
            {isActive ? 'Active' : 'Inactive'}
          </Badge>
          {customer.storeName && (
            <Badge variant="outline">
              {customer.storeName}
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div className="space-y-2">
          {customer.email && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Mail className="h-3 w-3" />
              <span>{customer.email}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Phone className="h-3 w-3" />
            <span>{customer.phone}</span>
          </div>
          {store && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Building2 className="h-3 w-3" />
              <span>{store.name}</span>
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-2 gap-4 pt-3 border-t">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-xs text-gray-500 mb-1">
              <ShoppingBag className="h-3 w-3" />
              <span>Orders</span>
            </div>
            <div className="text-lg font-semibold">{customer.totalOrders}</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-xs text-gray-500 mb-1">
              <DollarSign className="h-3 w-3" />
              <span>Spent</span>
            </div>
            <div className="text-lg font-semibold">₱{customer.totalSpent.toFixed(2)}</div>
          </div>
        </div>
        
        {customer.lastOrderDate && (
          <div className="flex items-center gap-2 text-xs text-gray-500 pt-2 border-t">
            <Calendar className="h-3 w-3" />
            <span>Last order: {new Date(customer.lastOrderDate).toLocaleDateString()}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
