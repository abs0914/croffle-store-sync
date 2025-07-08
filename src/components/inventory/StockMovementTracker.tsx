import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ArrowUp, 
  ArrowDown, 
  Package, 
  Search,
  Filter,
  Clock,
  User
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface StockMovement {
  id: string;
  inventory_stock_id: string;
  movement_type: string;
  quantity_change: number;
  previous_quantity: number;
  new_quantity: number;
  created_by: string;
  created_at: string;
  notes: string;
  inventory_item?: {
    item: string;
    unit: string;
  };
  user_info?: {
    first_name: string;
    last_name: string;
  } | null;
}

interface StockMovementTrackerProps {
  storeId: string;
}

export function StockMovementTracker({ storeId }: StockMovementTrackerProps) {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [movementTypeFilter, setMovementTypeFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    if (storeId) {
      fetchMovements(true);
      
      // Set up real-time updates for movements
      const channel = supabase
        .channel('stock-movements')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'inventory_movements'
          },
          () => {
            fetchMovements(true);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [storeId]);

  useEffect(() => {
    fetchMovements(true);
  }, [searchTerm, movementTypeFilter]);

  const fetchMovements = async (reset = false) => {
    try {
      setIsLoading(true);
      const currentPage = reset ? 1 : page;
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      let query = supabase
        .from('inventory_movements')
        .select(`
          *,
          inventory_item:inventory_stock!inventory_movements_inventory_stock_id_fkey(
            item,
            unit,
            store_id
          )
        `)
        .range(from, to)
        .order('created_at', { ascending: false });

      // Filter by store through inventory_stock
      query = query.filter('inventory_item.store_id', 'eq', storeId);

      // Apply search filter
      if (searchTerm) {
        query = query.or(`notes.ilike.%${searchTerm}%,inventory_item.item.ilike.%${searchTerm}%`);
      }

      // Apply movement type filter
      if (movementTypeFilter !== 'all') {
        query = query.eq('movement_type', movementTypeFilter);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      const movementsData = data?.filter(movement => movement.inventory_item).map(movement => ({
        ...movement,
        user_info: null // Simplified for now
      })) || [];
      
      if (reset) {
        setMovements(movementsData);
        setPage(2);
      } else {
        setMovements(prev => [...prev, ...movementsData]);
        setPage(prev => prev + 1);
      }

      setHasMore(movementsData.length === ITEMS_PER_PAGE);
    } catch (error) {
      console.error('Error fetching stock movements:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'increase':
      case 'purchase':
      case 'adjustment_increase':
      case 'transfer_in':
        return <ArrowUp className="h-4 w-4 text-green-600" />;
      case 'decrease':
      case 'sale':
      case 'adjustment_decrease':
      case 'transfer_out':
        return <ArrowDown className="h-4 w-4 text-red-600" />;
      default:
        return <Package className="h-4 w-4 text-gray-600" />;
    }
  };

  const getMovementBadgeVariant = (type: string) => {
    switch (type) {
      case 'increase':
      case 'purchase':
      case 'adjustment_increase':
      case 'transfer_in':
        return 'default';
      case 'decrease':
      case 'sale':
      case 'adjustment_decrease':
      case 'transfer_out':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const formatMovementType = (type: string) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Stock Movement Tracker
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search movements or items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={movementTypeFilter} onValueChange={setMovementTypeFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="purchase">Purchase</SelectItem>
              <SelectItem value="sale">Sale</SelectItem>
              <SelectItem value="adjustment">Adjustment</SelectItem>
              <SelectItem value="transfer_in">Transfer In</SelectItem>
              <SelectItem value="transfer_out">Transfer Out</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Movements List */}
        <div className="space-y-3">
          {movements.map((movement) => (
            <div 
              key={movement.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                {getMovementIcon(movement.movement_type)}
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">
                      {movement.inventory_item?.item || 'Unknown Item'}
                    </span>
                    <Badge variant={getMovementBadgeVariant(movement.movement_type)}>
                      {formatMovementType(movement.movement_type)}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {movement.notes || 'No notes provided'}
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(movement.created_at), 'MMM dd, yyyy HH:mm')}
                    </span>
                    {movement.user_info && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {movement.user_info.first_name} {movement.user_info.last_name}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`font-mono text-sm ${
                    movement.quantity_change > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {movement.quantity_change > 0 ? '+' : ''}{movement.quantity_change}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {movement.inventory_item?.unit || 'units'}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {movement.previous_quantity} → {movement.new_quantity}
                </div>
              </div>
            </div>
          ))}

          {movements.length === 0 && !isLoading && (
            <div className="text-center py-8 text-muted-foreground">
              No stock movements found
            </div>
          )}

          {hasMore && !isLoading && (
            <div className="text-center pt-4">
              <Button 
                variant="outline" 
                onClick={() => fetchMovements(false)}
                disabled={isLoading}
              >
                Load More
              </Button>
            </div>
          )}

          {isLoading && movements.length === 0 && (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
                    <div className="space-y-2">
                      <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-3 w-48 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-3 w-20 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}