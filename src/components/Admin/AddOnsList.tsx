import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Utensils, Coffee, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AddOnItem {
  id: string;
  name: string;
  category: string;
  price: number;
  cost_per_unit?: number;
  is_available: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export const AddOnsList: React.FC = () => {
  const [addOns, setAddOns] = useState<AddOnItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAddOns();
  }, []);

  const fetchAddOns = async () => {
    try {
      setLoading(true);
      // For now, display the static data since we just created these items
      setAddOns([
        {
          id: '1',
          name: 'Stirrer',
          category: 'utensils',
          price: 0,
          cost_per_unit: 1.27,
          is_available: true,
          display_order: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '2',
          name: 'Creamer',
          category: 'classic_sauce',
          price: 0,
          cost_per_unit: 2.00,
          is_available: true,
          display_order: 2,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '3',
          name: 'Sugar Sachet',
          category: 'classic_sauce',
          price: 0,
          cost_per_unit: 2.00,
          is_available: true,
          display_order: 3,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ]);
    } catch (error) {
      console.error('Error:', error);
      toast.error('An error occurred while fetching add-ons');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'utensils':
        return <Utensils className="h-4 w-4" />;
      case 'classic_sauce':
      case 'premium_sauce':
        return <Coffee className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'utensils':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'classic_sauce':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'premium_sauce':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">Loading add-ons...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Add-on Items</h2>
        <p className="text-muted-foreground">
          Available add-on items with zero pricing
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {addOns.map((addOn) => (
          <Card key={addOn.id} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  {getCategoryIcon(addOn.category)}
                  <h3 className="font-semibold">{addOn.name}</h3>
                </div>
                <Badge 
                  variant={addOn.is_available ? 'default' : 'secondary'}
                  className={addOn.is_available ? 'bg-green-100 text-green-800' : ''}
                >
                  {addOn.is_available ? 'Available' : 'Unavailable'}
                </Badge>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge 
                    variant="outline" 
                    className={getCategoryColor(addOn.category)}
                  >
                    {addOn.category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Price:</span>
                  <span className={`text-lg font-bold ${addOn.price === 0 ? 'text-green-600' : 'text-blue-600'}`}>
                    ₱{addOn.price.toFixed(2)}
                    {addOn.price === 0 && <span className="text-xs ml-1">(FREE)</span>}
                  </span>
                </div>

                {addOn.cost_per_unit && addOn.cost_per_unit > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Cost per unit:</span>
                    <span className="text-sm text-muted-foreground">₱{addOn.cost_per_unit.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {addOns.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Utensils className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No add-on items found</h3>
              <p className="text-muted-foreground">
                Add-on items will appear here once they are created.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};