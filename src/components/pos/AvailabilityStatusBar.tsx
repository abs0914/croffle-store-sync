import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Activity
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface AvailabilityStatusBarProps {
  storeId: string;
  className?: string;
}

interface AvailabilityStats {
  totalProducts: number;
  availableProducts: number;
  outOfStockProducts: number;
  lowStockProducts: number;
  lastUpdated: Date;
}

export const AvailabilityStatusBar: React.FC<AvailabilityStatusBarProps> = ({
  storeId,
  className = ""
}) => {
  const [stats, setStats] = useState<AvailabilityStats>({
    totalProducts: 0,
    availableProducts: 0,
    outOfStockProducts: 0,
    lowStockProducts: 0,
    lastUpdated: new Date()
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchAvailabilityStats = async () => {
    try {
      const { data: products, error } = await supabase
        .from('product_catalog')
        .select(`
          id,
          product_name,
          is_available,
          product_status,
          ingredients:product_ingredients(
            *,
            inventory_item:inventory_stock(stock_quantity)
          )
        `)
        .eq('store_id', storeId);

      if (error) {
        console.error('Error fetching availability stats:', error);
        return;
      }

      let availableCount = 0;
      let outOfStockCount = 0;
      let lowStockCount = 0;

      products?.forEach(product => {
        if (product.is_available) {
          availableCount++;
          
          // Check if it's low stock (can make less than 10 units)
          if (product.ingredients && product.ingredients.length > 0) {
            let maxQuantity = Infinity;
            
            product.ingredients.forEach(ingredient => {
              if (ingredient.inventory_item) {
                const availableStock = ingredient.inventory_item.stock_quantity || 0;
                const requiredQuantity = ingredient.required_quantity || 0;
                
                if (requiredQuantity > 0) {
                  const possibleQuantity = Math.floor(availableStock / requiredQuantity);
                  maxQuantity = Math.min(maxQuantity, possibleQuantity);
                }
              }
            });
            
            if (maxQuantity < 10 && maxQuantity !== Infinity) {
              lowStockCount++;
            }
          }
        } else {
          outOfStockCount++;
        }
      });

      setStats({
        totalProducts: products?.length || 0,
        availableProducts: availableCount,
        outOfStockProducts: outOfStockCount,
        lowStockProducts: lowStockCount,
        lastUpdated: new Date()
      });
    } catch (error) {
      console.error('Error fetching availability stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!storeId) return;

    fetchAvailabilityStats();

    // Set up real-time subscription for product catalog changes
    const subscription = supabase
      .channel(`availability_stats_${storeId}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'product_catalog',
          filter: `store_id=eq.${storeId}`
        }, 
        () => {
          fetchAvailabilityStats();
        }
      )
      .subscribe();

    // Refresh every 30 seconds
    const interval = setInterval(fetchAvailabilityStats, 30000);

    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
    };
  }, [storeId]);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-3">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 animate-pulse" />
            <span className="text-sm text-muted-foreground">Loading availability...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const availabilityPercentage = stats.totalProducts > 0 
    ? Math.round((stats.availableProducts / stats.totalProducts) * 100)
    : 0;

  const getAvailabilityTrend = () => {
    if (availabilityPercentage >= 90) {
      return { icon: TrendingUp, color: 'text-green-600', label: 'Excellent' };
    } else if (availabilityPercentage >= 75) {
      return { icon: TrendingUp, color: 'text-blue-600', label: 'Good' };
    } else if (availabilityPercentage >= 50) {
      return { icon: Clock, color: 'text-yellow-600', label: 'Fair' };
    } else {
      return { icon: TrendingDown, color: 'text-red-600', label: 'Poor' };
    }
  };

  const trend = getAvailabilityTrend();
  const TrendIcon = trend.icon;

  return (
    <Card className={className}>
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <TrendIcon className={`h-4 w-4 ${trend.color}`} />
              <span className="text-sm font-medium">{trend.label}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant="default" className="text-xs">
                <CheckCircle className="h-3 w-3 mr-1" />
                {stats.availableProducts}
              </Badge>
              
              {stats.outOfStockProducts > 0 && (
                <Badge variant="destructive" className="text-xs">
                  <XCircle className="h-3 w-3 mr-1" />
                  {stats.outOfStockProducts}
                </Badge>
              )}
              
              {stats.lowStockProducts > 0 && (
                <Badge variant="secondary" className="text-xs">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {stats.lowStockProducts} Low
                </Badge>
              )}
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-sm font-semibold">
              {availabilityPercentage}% Available
            </div>
            <div className="text-xs text-muted-foreground">
              {stats.totalProducts} total items
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AvailabilityStatusBar;
