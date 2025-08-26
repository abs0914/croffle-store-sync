import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConversionForm } from "./conversion";
import { ConversionHistory } from "./conversion";
import { BulkConversionDialog } from "./BulkConversionDialog";
import { ProductionManagementHeader } from "./ProductionManagementHeader";
import { Package, History, Settings } from "lucide-react";

// Mock data for demo
const mockPendingRequests = [
  {
    id: '1',
    name: 'Nutella 900g Bottle to Sauce Portions',
    requestedQuantity: 50,
    availableStock: 120,
    storeName: 'Makati Branch',
    priority: 'high' as const,
  },
  {
    id: '2', 
    name: 'Flour 25kg to Baking Portions',
    requestedQuantity: 30,
    availableStock: 80,
    storeName: 'BGC Branch',
    priority: 'medium' as const,
  },
  {
    id: '3',
    name: 'Chocolate Chips Bulk to Recipe Portions', 
    requestedQuantity: 25,
    availableStock: 60,
    storeName: 'Ortigas Branch',
    priority: 'low' as const,
  }
];

export function EnhancedProductionManagement() {
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [pendingRequests] = useState(mockPendingRequests);
  const [conversions] = useState([]); // Mock conversion history

  const handleBulkConversion = () => {
    setShowBulkDialog(true);
  };

  const handleRefresh = () => {
    // Implement refresh logic
    console.log('Refreshing production data...');
  };

  const handleBulkConversionSuccess = () => {
    // Refresh data after bulk conversion
    handleRefresh();
  };

  return (
    <div className="space-y-6">
      <ProductionManagementHeader 
        pendingConversions={pendingRequests.length}
        lowStockAlerts={pendingRequests.filter(r => r.priority === 'high').length}
        onBulkConversion={handleBulkConversion}
        onRefresh={handleRefresh}
      />

      <Tabs defaultValue="conversion" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="conversion" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Manual Conversion
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Conversion History
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Process Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="conversion">
          <div className="text-center py-12 text-muted-foreground">
            <Package className="h-16 w-16 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Manual Conversion</h3>
            <p>Individual item conversion interface</p>
            <p className="text-sm mt-2">Integration pending...</p>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <ConversionHistory conversions={conversions} />
        </TabsContent>

        <TabsContent value="settings">
          <div className="text-center py-12 text-muted-foreground">
            <Settings className="h-16 w-16 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Process Settings</h3>
            <p>Configure automatic conversion rules and thresholds</p>
            <p className="text-sm mt-2">Coming soon...</p>
          </div>
        </TabsContent>
      </Tabs>

      <BulkConversionDialog
        open={showBulkDialog}
        onOpenChange={setShowBulkDialog}
        pendingRequests={pendingRequests}
        onSuccess={handleBulkConversionSuccess}
      />
    </div>
  );
}