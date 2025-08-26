
import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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
  Truck,
  Building2
} from 'lucide-react';
import { Store } from '@/types';
import { useNavigate } from 'react-router-dom';

interface AdminStoreCardProps {
  store: Store;
  isSelected: boolean;
  onSelect: () => void;
}

export const AdminStoreCard: React.FC<AdminStoreCardProps> = ({
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
        return 'Unknown Location';
    }
  };

  return (
    <Card className={`transition-all duration-200 hover:shadow-md ${
      isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : ''
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={isSelected}
              onCheckedChange={onSelect}
            />
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-gray-600" />
              <h3 className="font-semibold text-lg">{store.name}</h3>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {store.location_type && (
              <Badge className={`text-xs ${getLocationBadgeColor(store.location_type)}`}>
                {getLocationLabel(store.location_type)}
              </Badge>
            )}
            <Badge variant={store.is_active ? 'default' : 'secondary'}>
              {store.is_active ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-start gap-2 text-sm text-gray-600">
            <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{store.address}</span>
          </div>
          
          {store.region && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Truck className="h-4 w-4 flex-shrink-0" />
              <span>Region: {store.region}</span>
              {store.logistics_zone && (
                <span className="text-gray-400">• {store.logistics_zone}</span>
              )}
            </div>
          )}

          {store.phone && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Phone className="h-4 w-4 flex-shrink-0" />
              <span>{store.phone}</span>
            </div>
          )}

          {store.email && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Mail className="h-4 w-4 flex-shrink-0" />
              <span>{store.email}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/admin/stores/edit/${store.id}`)}
          >
            <Edit className="h-4 w-4 mr-1" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/admin/stores/${store.id}/qr`)}
          >
            <QrCode className="h-4 w-4 mr-1" />
            QR
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/admin/stores/${store.id}/settings`)}
          >
            <Settings className="h-4 w-4 mr-1" />
            Settings
          </Button>
        </div>

        <div className="text-xs text-gray-500 pt-2 border-t">
          <div>ID: {store.id.slice(0, 8)}...</div>
          <div>Created: {new Date(store.created_at || '').toLocaleDateString()}</div>
        </div>
      </CardContent>
    </Card>
  );
};
