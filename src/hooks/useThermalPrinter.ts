
import { useState, useEffect } from 'react';
import { BluetoothPrinterService } from '@/services/printer/BluetoothPrinterService';
import { PrinterDiscovery, BluetoothPrinter, ThermalPrinter } from '@/services/printer/PrinterDiscovery';
import { Transaction, Customer } from '@/types';
import { Store } from '@/types/store';
import { toast } from 'sonner';

export function useThermalPrinter() {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [availablePrinters, setAvailablePrinters] = useState<BluetoothPrinter[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [connectedPrinter, setConnectedPrinter] = useState<BluetoothPrinter | null>(null);

  useEffect(() => {
    checkAvailability();

    // Set up periodic connection monitoring
    const monitorInterval = setInterval(() => {
      if (isConnected && connectedPrinter) {
        // Check if printer is still connected
        const currentlyConnected = PrinterDiscovery.isConnected();
        if (!currentlyConnected) {
          console.log('Printer disconnected, updating status...');
          setIsConnected(false);
          setConnectedPrinter(null);
          toast.info('Thermal printer disconnected');
        }
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(monitorInterval);
  }, [isConnected, connectedPrinter]);

  const checkAvailability = async () => {
    try {
      console.log('🔍 Checking thermal printer availability...');
      const available = await BluetoothPrinterService.isAvailable();
      console.log(`📱 Thermal printer availability result: ${available}`);
      setIsAvailable(available);
      
      if (available) {
        const connected = PrinterDiscovery.isConnected();
        setIsConnected(connected);
        setConnectedPrinter(PrinterDiscovery.getConnectedPrinter());
        console.log(`🔗 Printer connection status: ${connected}`);
      }
    } catch (error) {
      console.error('❌ Failed to check printer availability:', error);
      setIsAvailable(false);
    }
  };

  const scanForPrinters = async (showNativeDialog?: boolean) => {
    if (!isAvailable) {
      toast.error('Bluetooth not available on this device');
      return;
    }

    setIsScanning(true);
    try {
      toast.info('Scanning for thermal printers...');
      const printers = await PrinterDiscovery.scanForPrinters(showNativeDialog);
      setAvailablePrinters(printers);

      if (printers.length === 0) {
        toast.info('No thermal printers found. Make sure your printer is on and in pairing mode.');
      } else {
        toast.success(`Found ${printers.length} thermal printer(s)`);
      }
    } catch (error: any) {
      console.error('Failed to scan for printers:', error);

      // Provide specific error messages based on error type
      if (error.message?.includes('permissions')) {
        toast.error('Bluetooth permissions required. Please enable Bluetooth access.');
      } else if (error.message?.includes('not available')) {
        toast.error('Bluetooth not available on this device');
      } else if (error.message?.includes('not enabled')) {
        toast.error('Please enable Bluetooth on your device');
      } else {
        toast.error(`Scan failed: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setIsScanning(false);
    }
  };

  const connectToPrinter = async (printer: BluetoothPrinter) => {
    try {
      console.log(`Attempting to connect to printer: ${printer.name} (${printer.connectionType})`);
      toast.info(`Connecting to ${printer.name}...`);

      const success = await PrinterDiscovery.connectToPrinter(printer);

      if (success) {
        setIsConnected(true);
        setConnectedPrinter(printer);
        toast.success(`Connected to ${printer.name}`);
        console.log(`Successfully connected to ${printer.name}`);
      } else {
        toast.error(`Failed to connect to ${printer.name}. Please try again.`);
        console.error(`Connection failed for ${printer.name}`);
      }

      return success;
    } catch (error: any) {
      console.error('Failed to connect to printer:', error);

      // Provide specific error messages
      if (error.message?.includes('GATT')) {
        toast.error('Bluetooth connection failed. Please ensure the printer is in pairing mode.');
      } else if (error.message?.includes('not available')) {
        toast.error('Printer not available. Please check if it\'s powered on.');
      } else {
        toast.error(`Connection failed: ${error.message || 'Unknown error'}`);
      }

      return false;
    }
  };

  const disconnectPrinter = async () => {
    try {
      await PrinterDiscovery.disconnectPrinter();
      setIsConnected(false);
      setConnectedPrinter(null);
      toast.success('Printer disconnected');
    } catch (error) {
      console.error('Failed to disconnect printer:', error);
      toast.error('Failed to disconnect printer');
    }
  };

  const printReceipt = async (
    transaction: Transaction,
    customer?: Customer | null,
    store?: Store,
    cashierName?: string
  ) => {
    if (!isConnected) {
      toast.error('No printer connected');
      return false;
    }

    setIsPrinting(true);
    try {
      console.log(`Starting receipt print for transaction: ${transaction.receiptNumber}`);
      toast.info('Sending receipt to printer...');

      const success = await BluetoothPrinterService.printReceipt(transaction, customer, store, cashierName);

      if (success) {
        toast.success('Receipt sent to printer successfully!');
        console.log(`✅ Receipt printed successfully: ${transaction.receiptNumber}`);
      } else {
        toast.error('Failed to send receipt to printer');
        console.error(`❌ Receipt printing failed: ${transaction.receiptNumber}`);
      }

      return success;
    } catch (error: any) {
      console.error('Failed to print receipt:', error);

      // Provide specific error messages based on error type
      if (error.message?.includes('service')) {
        toast.error('Printer service not found. Check printer compatibility.');
      } else if (error.message?.includes('characteristic')) {
        toast.error('Printer communication failed. Try reconnecting.');
      } else if (error.message?.includes('write')) {
        toast.error('Failed to send data to printer. Check connection.');
      } else {
        toast.error(`Printing failed: ${error.message || 'Unknown error'}`);
      }

      return false;
    } finally {
      setIsPrinting(false);
    }
  };

  const printTestReceipt = async () => {
    if (!isConnected) {
      toast.error('No printer connected');
      return false;
    }

    setIsPrinting(true);
    try {
      console.log('Starting test receipt print...');
      toast.info('Sending test receipt to printer...');

      const success = await BluetoothPrinterService.printTestReceipt();

      if (success) {
        toast.success('Test receipt sent to printer successfully!');
        console.log('✅ Test receipt printed successfully');
      } else {
        toast.error('Failed to send test receipt to printer');
        console.error('❌ Test receipt printing failed');
      }

      return success;
    } catch (error: any) {
      console.error('Failed to print test receipt:', error);

      // Provide specific error messages based on error type
      if (error.message?.includes('service')) {
        toast.error('Printer service not found. Check printer compatibility.');
      } else if (error.message?.includes('characteristic')) {
        toast.error('Printer communication failed. Try reconnecting.');
      } else if (error.message?.includes('write')) {
        toast.error('Failed to send data to printer. Check connection.');
      } else {
        toast.error(`Test print failed: ${error.message || 'Unknown error'}`);
      }

      return false;
    } finally {
      setIsPrinting(false);
    }
  };

  const testServiceDiscovery = async () => {
    if (!isConnected) {
      toast.error('No printer connected');
      return false;
    }

    try {
      console.log('Starting service discovery test...');
      toast.info('Testing printer service discovery...');

      const success = await BluetoothPrinterService.testServiceDiscovery();

      if (success) {
        toast.success('Service discovery completed! Check console for details.');
        console.log('✅ Service discovery test completed');
      } else {
        toast.error('Service discovery failed! Check console for details.');
        console.error('❌ Service discovery test failed');
      }

      return success;
    } catch (error: any) {
      console.error('Failed to test service discovery:', error);
      toast.error(`Service discovery test failed: ${error.message || 'Unknown error'}`);
      return false;
    }
  };

  return {
    isAvailable,
    isConnected,
    availablePrinters,
    isScanning,
    isPrinting,
    connectedPrinter,
    scanForPrinters,
    connectToPrinter,
    disconnectPrinter,
    printReceipt,
    printTestReceipt,
    testServiceDiscovery,
    checkAvailability
  };
}
