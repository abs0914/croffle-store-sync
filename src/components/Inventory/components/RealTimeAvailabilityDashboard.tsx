
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  RefreshCw,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package
} from 'lucide-react';
import { useAuth } from '@/contexts/auth';
import { realTimeAvailabilityService, RealTimeAvailabilityCheck } from '@/services/inventory/realTimeAvailabilityService';
import { calculateProductProfitability, ProductProfitability } from '@/services/analytics/profitabilityAnalysisService';
import { toast } from 'sonner';

// Menu items with their pricing
const MENU_ITEMS = [
  // Croffles
  { name: 'Tiramisu Croffle', price: 125, category: 'croffles' },
  { name: 'Choco Nut Croffle', price: 125, category: 'croffles' },
  { name: 'Caramel Delight Croffle', price: 125, category: 'croffles' },
  { name: 'Biscoff Croffle', price: 125, category: 'croffles' },
  { name: 'Nutella Croffle', price: 125, category: 'croffles' },
  
  // Drinks
  { name: 'Americano', price: 65, category: 'drinks' },
  { name: 'Cappuccino', price: 75, category: 'drinks' },
  { name: 'Cafe Latte', price: 75, category: 'drinks' },
];

export const RealTimeAvailabilityDashboard: React.FC = () => {
  const { user } = useAuth();
  const [availabilityData, setAvailabilityData] = useState<RealTimeAvailabilityCheck[]>([]);
  const [profitabilityData, setProfitabilityData] = useState<ProductProfitability[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const storeId = user?.storeIds?.[0] || '';

  const checkAvailability = async () => {
    if (!storeId) return;
    
    setIsLoading(true);
    try {
      const availabilityChecks = await Promise.all(
        MENU_ITEMS.map(item => 
          realTimeAvailabilityService.checkProductAvailability(
            item.name,
            storeId,
            1,
            item.price
          )
        )
      );

      const profitabilityChecks = await Promise.all(
        MENU_ITEMS.map(item =>
          calculateProductProfitability(item.name, item.price, storeId)
        )
      );

      setAvailabilityData(availabilityChecks);
      setProfitabilityData(profitabilityChecks);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error checking availability:', error);
      toast.error('Failed to check product availability');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAvailability();
    
    // Auto-refresh every 2 minutes
    const interval = setInterval(checkAvailability, 120000);
    return () => clearInterval(interval);
  }, [storeId]);

  const availableItems = availabilityData.filter(item => item.isAvailable);
  const unavailableItems = availabilityData.filter(item => !item.isAvailable);
  const lowStockItems = availabilityData.filter(item => item.isAvailable && item.maxQuantity < 10);

  const avgProfitMargin = profitabilityData.length > 0
    ? profitabilityData.reduce((sum, item) => sum + item.profitMargin, 0) / profitabilityData.length
    : 0;

  const highProfitItems = profitabilityData.filter(item => item.profitMargin > 50);
  const lowProfitItems = profitabilityData.filter(item => item.profitMargin < 30);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Real-Time Availability Dashboard</h3>
          <p className="text-sm text-muted-foreground">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </p>
        </div>
        <Button onClick={checkAvailability} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Available Items</p>
                <p className="text-2xl font-bold text-green-600">{availableItems.length}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Unavailable</p>
                <p className="text-2xl font-bold text-red-600">{unavailableItems.length}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Low Stock</p>
                <p className="text-2xl font-bold text-yellow-600">{lowStockItems.length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Profit Margin</p>
                <p className="text-2xl font-bold text-blue-600">{avgProfitMargin.toFixed(1)}%</p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="availability">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="availability">Availability Status</TabsTrigger>
          <TabsTrigger value="profitability">Profitability Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="availability" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availabilityData.map((item) => (
              <Card key={item.productName}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">{item.productName}</CardTitle>
                    <Badge 
                      variant={item.isAvailable ? "default" : "destructive"}
                      className="flex items-center gap-1"
                    >
                      {item.isAvailable ? (
                        <CheckCircle className="h-3 w-3" />
                      ) : (
                        <XCircle className="h-3 w-3" />
                      )}
                      {item.isAvailable ? 'Available' : 'Unavailable'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {item.isAvailable && (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Max Quantity:</span>
                        <span className="font-medium">{item.maxQuantity}</span>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Stock Level:</span>
                          <span className="text-xs">
                            {item.maxQuantity < 10 ? 'Low' : item.maxQuantity < 25 ? 'Medium' : 'High'}
                          </span>
                        </div>
                        <Progress 
                          value={Math.min((item.maxQuantity / 50) * 100, 100)} 
                          className="h-2"
                        />
                      </div>
                    </>
                  )}
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Cost:</span>
                    <span className="font-medium">₱{item.estimatedCost.toFixed(2)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Profit Margin:</span>
                    <div className="flex items-center gap-1">
                      {item.profitMargin > 50 ? (
                        <TrendingUp className="h-3 w-3 text-green-600" />
                      ) : item.profitMargin < 30 ? (
                        <TrendingDown className="h-3 w-3 text-red-600" />
                      ) : null}
                      <span className={`font-medium ${
                        item.profitMargin > 50 ? 'text-green-600' : 
                        item.profitMargin < 30 ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        {item.profitMargin.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="profitability" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  High Profit Items
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {highProfitItems.length > 0 ? (
                  highProfitItems.map((item) => (
                    <div key={item.productName} className="flex justify-between items-center p-2 bg-green-50 rounded">
                      <div>
                        <p className="font-medium">{item.productName}</p>
                        <p className="text-sm text-muted-foreground">₱{item.sellingPrice} - ₱{item.totalCost.toFixed(2)}</p>
                      </div>
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        {item.profitMargin.toFixed(1)}%
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No high profit items</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-red-600" />
                  Low Profit Items
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {lowProfitItems.length > 0 ? (
                  lowProfitItems.map((item) => (
                    <div key={item.productName} className="flex justify-between items-center p-2 bg-red-50 rounded">
                      <div>
                        <p className="font-medium">{item.productName}</p>
                        <p className="text-sm text-muted-foreground">₱{item.sellingPrice} - ₱{item.totalCost.toFixed(2)}</p>
                      </div>
                      <Badge variant="secondary" className="bg-red-100 text-red-800">
                        {item.profitMargin.toFixed(1)}%
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No low profit items</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
