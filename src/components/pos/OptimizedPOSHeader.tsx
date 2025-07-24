import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Settings, User, Wifi, WifiOff, Clock, AlertTriangle, CheckCircle, AlertCircle, Menu, Receipt } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useShift } from "@/contexts/shift";
import StartShiftDialog from "./dialogs/StartShiftDialog";
import { useState } from "react";
import { formatDistanceToNow } from 'date-fns';
import { useQuery } from "@tanstack/react-query";
import { fetchCashierById } from "@/services/cashier";
import { useAuth } from "@/contexts/auth";
// Simple mock service for POS inventory status
const getPOSInventoryStatus = async (storeId: string) => {
  return {
    totalItems: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
    healthyItems: 0
  };
};
import { StoreNameDisplay } from "@/components/shared/StoreNameDisplay";
import { useStoreDisplay } from "@/contexts/StoreDisplayContext";
import { PrinterStatusIndicator } from "@/components/printer/PrinterStatusIndicator";
import { ThermalPrinterSettings } from "@/components/printer/ThermalPrinterSettings";
import { Customer } from "@/types";

interface OptimizedPOSHeaderProps {
  currentStore: any;
  currentShift: any;
  selectedCustomer: Customer | null;
  isConnected: boolean;
  lastSync: Date;
  storeId?: string;
  lastTransaction?: any;
  lastCustomer?: Customer | null;
  onViewReceipt?: () => void;
}

export default function OptimizedPOSHeader({
  currentStore,
  currentShift: propsCurrentShift,
  selectedCustomer,
  isConnected,
  lastSync,
  storeId,
  lastTransaction,
  lastCustomer,
  onViewReceipt
}: OptimizedPOSHeaderProps) {
  const { user } = useAuth();
  const { config } = useStoreDisplay();
  const { currentShift, startShift } = useShift();
  const [isStartShiftOpen, setIsStartShiftOpen] = useState(false);

  // Use the shift from context, not props
  const activeShift = currentShift || propsCurrentShift;

  // Cashier data
  const { data: cashier } = useQuery({
    queryKey: ["cashier", activeShift?.cashier_id],
    queryFn: () => activeShift?.cashier_id ? fetchCashierById(activeShift.cashier_id) : Promise.resolve(null),
    enabled: !!activeShift?.cashier_id
  });

  // Inventory status
  const handleStartShift = async (
    startingCash: number,
    photo?: string,
    cashierId?: string
  ) => {
    try {
      const success = await startShift(startingCash, photo, cashierId);
      if (success) {
        setIsStartShiftOpen(false);
      }
    } catch (error) {
      console.error("Error starting shift:", error);
    }
  };
  
  const { data: inventoryStatus } = useQuery({
    queryKey: ["pos-inventory-status", storeId],
    queryFn: () => storeId ? getPOSInventoryStatus(storeId) : Promise.resolve(null),
    enabled: !!storeId,
    refetchInterval: 30000
  });

  const getCashierDisplay = () => {
    if (cashier) {
      return (
        <div className="flex items-center gap-1.5">
          <User className="h-3.5 w-3.5 text-green-600" />
          <span className="text-sm font-medium text-foreground">{cashier.fullName}</span>
          <Badge variant="secondary" className="text-xs px-1.5 py-0.5">Cashier</Badge>
        </div>
      );
    }
    
    if (activeShift && user) {
      return (
        <div className="flex items-center gap-1.5">
          <User className="h-3.5 w-3.5 text-green-600" />
          <span className="text-sm font-medium text-foreground">{user.name}</span>
          <Badge variant="secondary" className="text-xs px-1.5 py-0.5">Cashier</Badge>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-1.5">
        <User className="h-3.5 w-3.5 text-orange-500" />
        <span className="text-xs text-orange-600">No cashier</span>
      </div>
    );
  };

  const getInventoryStatus = () => {
    if (!inventoryStatus) {
      return (
        <Badge variant="outline" className="text-xs">
          <Clock className="h-3 w-3 mr-1" />
          Loading...
        </Badge>
      );
    }

    const { outOfStockItems, lowStockItems } = inventoryStatus;
    
    if (outOfStockItems > 0) {
      return (
        <Badge variant="destructive" className="text-xs">
          <AlertTriangle className="h-3 w-3 mr-1" />
          {outOfStockItems} out of stock
        </Badge>
      );
    }
    
    if (lowStockItems > 0) {
      return (
        <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700">
          <AlertCircle className="h-3 w-3 mr-1" />
          {lowStockItems} low stock
        </Badge>
      );
    }
    
    return (
      <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
        <CheckCircle className="h-3 w-3 mr-1" />
        Stock healthy
      </Badge>
    );
  };

  const getSyncStatus = () => {
    return (
      <div className="flex items-center gap-1">
        {isConnected ? (
          <Wifi className="h-3.5 w-3.5 text-green-500" />
        ) : (
          <WifiOff className="h-3.5 w-3.5 text-red-500" />
        )}
        <Badge variant={isConnected ? "default" : "destructive"} className="text-xs px-1.5 py-0.5">
          {isConnected ? 'Live' : 'Offline'}
        </Badge>
      </div>
    );
  };

  return (
    <Card className="border-b border-border/50 rounded-none shadow-sm">
      <div className="px-3 py-2">
        <div className="flex items-center justify-between">
          {/* Left Section: Sidebar Toggle, Store & Cashier */}
          <div className="flex items-center gap-2 md:gap-3">
            <SidebarTrigger className="h-6 w-6 p-0" />
            
            {currentStore && config.contentMode !== "hidden" && (
              <>
                <Separator orientation="vertical" className="h-4" />
                <StoreNameDisplay variant="badge" size="sm" showLogo={true} />
              </>
            )}
            
            <Separator orientation="vertical" className="h-4" />
            
            {getCashierDisplay()}

            {selectedCustomer && (
              <>
                <Separator orientation="vertical" className="h-4 hidden sm:block" />
                <Badge variant="outline" className="text-xs hidden sm:inline-flex">
                  Customer: {selectedCustomer.name}
                </Badge>
              </>
            )}
          </div>

          {/* Right Section: Status & Settings */}
          <div className="flex items-center gap-2">
            {/* Shift Status - Show if no active shift */}
            {!activeShift && (
              <>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  className="h-6 text-xs px-2"
                  onClick={() => setIsStartShiftOpen(true)}
                >
                  Start Shift
                </Button>
                <Separator orientation="vertical" className="h-4" />
              </>
            )}
            
            <div className="hidden md:flex items-center gap-2">
              {getInventoryStatus()}
              <Separator orientation="vertical" className="h-4" />
            </div>
            
            {getSyncStatus()}
            
            <span className="text-xs text-muted-foreground hidden lg:inline">
              {formatDistanceToNow(lastSync, { addSuffix: true })}
            </span>
            
            <Separator orientation="vertical" className="h-4 hidden lg:block" />
            
            <div className="flex items-center gap-1">
              {lastTransaction && onViewReceipt && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 w-6 p-0"
                  onClick={onViewReceipt}
                  title="View Last Receipt"
                >
                  <Receipt className="h-3 w-3" />
                </Button>
              )}
              <PrinterStatusIndicator />
              <ThermalPrinterSettings>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <Settings className="h-3 w-3" />
                </Button>
              </ThermalPrinterSettings>
            </div>
          </div>
        </div>
      </div>
      
      {/* Start Shift Dialog */}
      <StartShiftDialog
        isOpen={isStartShiftOpen}
        onOpenChange={setIsStartShiftOpen}
        onStartShift={handleStartShift}
        storeId={currentStore?.id || null}
      />
    </Card>
  );
}