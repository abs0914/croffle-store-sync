
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  MapPin, 
  Phone, 
  Mail, 
  Edit, 
  QrCode, 
  Settings,
  Building2,
  Truck
} from 'lucide-react';
import { Store } from '@/types';
import { useNavigate } from 'react-router-dom';

interface AdminStoreListItemProps {
  store: Store;
  isSelected: boolean;
  onSelect: () => void;
}

export const AdminStoreListItem: React.FC<AdminStoreListItemProps> = ({
  store,
  isSelected,
  onSelect
}) => {
  const navigate = useNavigate();

  const getLocationBadgeColor = (locationType?: string) => {
    switch (locationType) {
      case 'inside_cebu':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'outside_cebu':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getLocationLabel = (locationType?: string) => {
    switch (locationType) {
      case 'inside_cebu':
        return 'Inside Cebu';
      case 'outside_cebu':
        return 'Outside Cebu';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className={`flex items-center gap-4 p-4 border rounded-lg transition-all duration-200 hover:shadow-sm ${
      isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : 'bg-white'
    }`}>
      <Checkbox
        checked={isSelected}
        onCheckedChange={onSelect}
      />
      
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <Building2 className="h-5 w-5 text-gray-600 flex-shrink-0" />
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">{store.name}</h3>
            {store.location_type && (
              <Badge className={`text-xs ${getLocationBadgeColor(store.location_type)}`}>
                {getLocationLabel(store.location_type)}
              </Badge>
            )}
            <Badge variant={store.is_active ? 'default' : 'secondary'} className="text-xs">
              {store.is_active ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              <span className="truncate max-w-xs">{store.address}</span>
            </div>
            {store.region && (
              <div className="flex items-center gap-1">
                <Truck className="h-3 w-3" />
                <span>{store.region}</span>
                {store.logistics_zone && (
                  <span className="text-gray-400">• {store.logistics_zone}</span>
                )}
              </div>
            )}
            {store.phone && (
              <div className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                <span>{store.phone}</span>
              </div>
            )}
            {store.email && (
              <div className="flex items-center gap-1">
                <Mail className="h-3 w-3" />
                <span>{store.email}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/admin/stores/edit/${store.id}`)}
        >
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/admin/stores/${store.id}/qr`)}
        >
          <QrCode className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/admin/stores/${store.id}/settings`)}
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
