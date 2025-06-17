
import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Store, Settings, MoreVertical, MapPin, Phone, Mail } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Store as StoreType } from '@/types';
import { useNavigate } from 'react-router-dom';

interface AdminStoreCardProps {
  store: StoreType;
  isSelected: boolean;
  onSelect: () => void;
}

export const AdminStoreCard: React.FC<AdminStoreCardProps> = ({
  store,
  isSelected,
  onSelect
}) => {
  const navigate = useNavigate();

  return (
    <Card className={`relative transition-all ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:shadow-md'}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={isSelected}
              onCheckedChange={onSelect}
              onClick={(e) => e.stopPropagation()}
            />
            <div className="flex items-center gap-2">
              <Store className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold text-lg truncate">{store.name}</h3>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <Badge variant={store.is_active ? 'default' : 'secondary'}>
              {store.is_active ? 'Active' : 'Inactive'}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate(`/stores/${store.id}`)}>
                  Edit Store
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate(`/admin/stores/${store.id}/settings`)}>
                  Configure
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate(`/admin/stores/${store.id}/analytics`)}>
                  View Analytics
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <MapPin className="h-4 w-4" />
          <span className="truncate">{store.address}</span>
        </div>
        
        {store.phone && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Phone className="h-4 w-4" />
            <span>{store.phone}</span>
          </div>
        )}
        
        {store.email && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Mail className="h-4 w-4" />
            <span className="truncate">{store.email}</span>
          </div>
        )}
        
        <div className="flex items-center justify-between pt-3 border-t">
          <div className="text-xs text-gray-500">
            Created: {new Date(store.created_at || '').toLocaleDateString()}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/admin/stores/${store.id}/settings`)}
          >
            <Settings className="h-4 w-4 mr-2" />
            Configure
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
