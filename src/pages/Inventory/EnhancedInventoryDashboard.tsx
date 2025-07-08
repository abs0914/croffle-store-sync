
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  Package, 
  Coffee, 
  TrendingUp,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { RealTimeAvailabilityDashboard } from '@/components/Inventory/components/RealTimeAvailabilityDashboard';
import { ComboInventoryHandler } from '@/components/Inventory/components/ComboInventoryHandler';
// Removed ProactiveReorderingSystem import as it was deleted

export const EnhancedInventoryDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('availability');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Enhanced Inventory Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time inventory tracking with smart recipe integration and profitability analysis
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="availability" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Real-Time Availability
          </TabsTrigger>
          <TabsTrigger value="combos" className="flex items-center gap-2">
            <Coffee className="h-4 w-4" />
            Combo Handling
          </TabsTrigger>
          <TabsTrigger value="reordering" className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Proactive Reordering
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Cost Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="availability">
          <RealTimeAvailabilityDashboard />
        </TabsContent>

        <TabsContent value="combos">
          <ComboInventoryHandler />
        </TabsContent>

        <TabsContent value="reordering">
          <div className="text-center p-8 text-muted-foreground">
            Proactive reordering system is not available in this simplified version.
          </div>
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Cost Tracking & Profitability Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">₱12,450</p>
                      <p className="text-sm text-muted-foreground">Total Revenue (Today)</p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">₱4,890</p>
                      <p className="text-sm text-muted-foreground">Total Cost (Today)</p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-purple-600">60.7%</p>
                      <p className="text-sm text-muted-foreground">Profit Margin</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <span className="font-medium text-yellow-800">Cost Analysis Insights</span>
                </div>
                <ul className="space-y-1 text-sm text-yellow-700">
                  <li>• Nutella Croffle has the lowest profit margin (28.5%)</li>
                  <li>• Americano shows highest profitability (72.3%)</li>
                  <li>• Consider adjusting pricing for premium items</li>
                  <li>• Combo deals are driving overall profitability up</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
