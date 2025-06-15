
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ThermalPrinterSettings } from '@/components/printer/ThermalPrinterSettings';
import { PrinterStatusIndicator } from '@/components/printer/PrinterStatusIndicator';
import { Printer } from 'lucide-react';

export function ThermalPrinterPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Thermal Printer Settings</h1>
        <PrinterStatusIndicator />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Bluetooth Thermal Printer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600">
            Connect and manage your Bluetooth thermal printer for fast receipt printing.
            Perfect for mobile POS operations and improving customer service speed.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <ThermalPrinterSettings>
              <Button className="flex-1">
                <Printer className="mr-2 h-4 w-4" />
                Printer Settings
              </Button>
            </ThermalPrinterSettings>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">Setup Instructions:</h3>
            <ol className="text-sm text-blue-800 space-y-1">
              <li>1. Turn on your thermal printer and enable Bluetooth pairing mode</li>
              <li>2. Click "Printer Settings" and scan for available devices</li>
              <li>3. Select your printer from the list and connect</li>
              <li>4. Run a test print to verify the connection</li>
              <li>5. Your thermal printer is now ready for use!</li>
            </ol>
          </div>

          <div className="mt-4 p-4 bg-amber-50 rounded-lg">
            <h3 className="font-semibold text-amber-900 mb-2">Supported Features:</h3>
            <ul className="text-sm text-amber-800 space-y-1">
              <li>• ESC/POS thermal printing</li>
              <li>• Receipt formatting for 58mm and 80mm paper</li>
              <li>• QR code printing</li>
              <li>• Automatic paper cutting</li>
              <li>• Text formatting (bold, center, sizing)</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
