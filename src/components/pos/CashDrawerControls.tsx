import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TestTube, Zap, AlertCircle } from "lucide-react";
import { BluetoothPrinterService } from "@/services/printer/BluetoothPrinterService";
import { PrinterDiscovery } from "@/services/printer/PrinterDiscovery";
import { toast } from "sonner";

export function CashDrawerControls() {
  const [isOpening, setIsOpening] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [lastOperation, setLastOperation] = useState<string | null>(null);

  const handleOpenDrawer = async () => {
    setIsOpening(true);
    try {
      const success = await BluetoothPrinterService.openCashDrawer();
      if (success) {
        toast.success("Cash drawer opened successfully");
        setLastOperation("Drawer opened");
      } else {
        toast.error("Failed to open cash drawer");
        setLastOperation("Open failed");
      }
    } catch (error: any) {
      console.error('Cash drawer error:', error);
      toast.error(error.message || "Cash drawer operation failed");
      setLastOperation("Error");
    } finally {
      setIsOpening(false);
    }
  };

  const handleTestDrawer = async () => {
    setIsTesting(true);
    try {
      const success = await BluetoothPrinterService.testCashDrawer();
      if (success) {
        toast.success("Cash drawer test successful");
        setLastOperation("Test passed");
      } else {
        toast.warning("Cash drawer test failed - check connection");
        setLastOperation("Test failed");
      }
    } catch (error: any) {
      console.error('Cash drawer test error:', error);
      toast.error(error.message || "Cash drawer test failed");
      setLastOperation("Test error");
    } finally {
      setIsTesting(false);
    }
  };

  const connectedPrinter = PrinterDiscovery.getConnectedPrinter();
  const isConnected = connectedPrinter?.isConnected || false;

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Cash Drawer Control
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant={isConnected ? "default" : "destructive"}>
            {isConnected ? "Printer Connected" : "No Printer"}
          </Badge>
          {lastOperation && (
            <Badge variant="outline" className="text-xs">
              {lastOperation}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {!isConnected && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted p-3 rounded-lg">
            <AlertCircle className="h-4 w-4" />
            Connect a Bluetooth thermal printer to control the cash drawer
          </div>
        )}
        
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={handleOpenDrawer}
            disabled={!isConnected || isOpening}
            variant="default"
            size="sm"
            className="flex items-center gap-2"
          >
            <Zap className="h-4 w-4" />
            {isOpening ? "Opening..." : "Open Drawer"}
          </Button>
          
          <Button
            onClick={handleTestDrawer}
            disabled={!isConnected || isTesting}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <TestTube className="h-4 w-4" />
            {isTesting ? "Testing..." : "Test Drawer"}
          </Button>
        </div>
        
        <div className="text-xs text-muted-foreground">
          <p>• Open Drawer: Manually trigger cash drawer</p>
          <p>• Test Drawer: Verify drawer connectivity</p>
        </div>
      </CardContent>
    </Card>
  );
}