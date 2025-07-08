import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, ShoppingCart, TrendingDown, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface LowStockItem {
  id: string;
  item: string;
  unit: string;
  stock_quantity: number;
  minimum_threshold: number;
  maximum_capacity: number;
  cost: number;
  suggestedOrderQuantity: number;
  urgencyLevel: 'critical' | 'warning' | 'low';
}

interface SmartReorderingSystemProps {
  storeId: string;
}

export function SmartReorderingSystem({ storeId }: SmartReorderingSystemProps) {
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);

  useEffect(() => {
    if (storeId) {
      fetchLowStockItems();
    }
  }, [storeId]);

  const fetchLowStockItems = async () => {
    try {
      const { data: items, error } = await supabase
        .from('inventory_stock')
        .select('*')
        .eq('store_id', storeId)
        .eq('is_active', true);

      if (error) throw error;

      const lowStockItems: LowStockItem[] = items
        ?.filter(item => item.stock_quantity <= (item.minimum_threshold || 10))
        .map(item => {
          const threshold = item.minimum_threshold || 10;
          const maxCapacity = item.maximum_capacity || 100;
          const currentStock = item.stock_quantity;
          
          // Calculate suggested order quantity
          const suggestedOrderQuantity = Math.max(
            maxCapacity - currentStock,
            threshold * 2
          );

          // Determine urgency level
          let urgencyLevel: 'critical' | 'warning' | 'low';
          if (currentStock <= 0) {
            urgencyLevel = 'critical';
          } else if (currentStock <= threshold * 0.5) {
            urgencyLevel = 'warning';
          } else {
            urgencyLevel = 'low';
          }

          return {
            ...item,
            suggestedOrderQuantity,
            urgencyLevel
          };
        })
        .sort((a, b) => {
          // Sort by urgency level first
          const urgencyOrder = { critical: 0, warning: 1, low: 2 };
          return urgencyOrder[a.urgencyLevel] - urgencyOrder[b.urgencyLevel];
        }) || [];

      setLowStockItems(lowStockItems);
    } catch (error) {
      console.error('Error fetching low stock items:', error);
      toast.error('Failed to load low stock items');
    } finally {
      setIsLoading(false);
    }
  };

  const createSmartReorder = async () => {
    if (lowStockItems.length === 0) return;

    setIsCreatingOrder(true);
    try {
      // Generate order number
      const orderNumber = `AUTO-${Date.now()}`;

      // Create stock order
      const { data: stockOrder, error: orderError } = await supabase
        .from('stock_orders')
        .insert({
          store_id: storeId,
          status: 'requested',
          notes: `Smart reorder for ${lowStockItems.length} low stock items`,
          order_number: orderNumber,
          requested_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Add items to the order
      const orderItems = lowStockItems.map(item => ({
        stock_order_id: stockOrder.id,
        inventory_stock_id: item.id,
        requested_quantity: item.suggestedOrderQuantity,
        notes: `Auto-reorder: Current stock ${item.stock_quantity}, Threshold ${item.minimum_threshold}`
      }));

      const { error: itemsError } = await supabase
        .from('stock_order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      toast.success(`Smart reorder created for ${lowStockItems.length} items`);
      
      // Refresh the low stock items
      fetchLowStockItems();
    } catch (error) {
      console.error('Error creating smart reorder:', error);
      toast.error('Failed to create smart reorder');
    } finally {
      setIsCreatingOrder(false);
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'destructive';
      case 'warning': return 'default';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'critical': return <AlertTriangle className="h-4 w-4" />;
      case 'warning': return <TrendingDown className="h-4 w-4" />;
      case 'low': return <Clock className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Smart Reordering System
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading inventory analysis...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" />
          Smart Reordering System
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {lowStockItems.length === 0 ? (
          <Alert>
            <AlertDescription>
              All items are properly stocked. No reordering needed at this time.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {lowStockItems.length} items need restocking
              </p>
              <Button 
                onClick={createSmartReorder}
                disabled={isCreatingOrder}
                className="flex items-center gap-2"
              >
                <ShoppingCart className="h-4 w-4" />
                {isCreatingOrder ? 'Creating Order...' : 'Create Smart Reorder'}
              </Button>
            </div>

            <div className="space-y-3">
              {lowStockItems.slice(0, 5).map((item) => (
                <div 
                  key={item.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{item.item}</span>
                      <Badge variant={getUrgencyColor(item.urgencyLevel)}>
                        {getUrgencyIcon(item.urgencyLevel)}
                        {item.urgencyLevel.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Current: {item.stock_quantity} {item.unit} | 
                      Threshold: {item.minimum_threshold} {item.unit}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">
                      Order: {item.suggestedOrderQuantity} {item.unit}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Est. Cost: ₱{(item.cost * item.suggestedOrderQuantity).toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}

              {lowStockItems.length > 5 && (
                <p className="text-sm text-muted-foreground text-center">
                  +{lowStockItems.length - 5} more items in the smart reorder
                </p>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}