
import { useState, useEffect } from 'react';
import { BluetoothPrinterService } from '@/services/printer/BluetoothPrinterService';
import { PrinterDiscovery, ThermalPrinter } from '@/services/printer/PrinterDiscovery';
import { Transaction, Customer } from '@/types';
import { toast } from 'sonner';

export function useThermalPrinter() {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [availablePrinters, setAvailablePrinters] = useState<ThermalPrinter[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [connectedPrinter, setConnectedPrinter] = useState<ThermalPrinter | null>(null);

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
      const available = await BluetoothPrinterService.isAvailable();
      setIsAvailable(available);
      
      if (available) {
        const connected = PrinterDiscovery.isConnected();
        setIsConnected(connected);
        setConnectedPrinter(PrinterDiscovery.getConnectedPrinter());
      }
    } catch (error) {
      console.error('Failed to check printer availability:', error);
      setIsAvailable(false);
    }
  };

  const scanForPrinters = async () => {
    if (!isAvailable) {
      toast.error('Bluetooth not available on this device');
      return;
    }

    setIsScanning(true);
    try {
      toast.info('Scanning for thermal printers...');
      const printers = await PrinterDiscovery.scanForPrinters();
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

  const connectToPrinter = async (printer: ThermalPrinter) => {
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
    storeName?: string
  ) => {
    if (!isConnected) {
      toast.error('No printer connected');
      return false;
    }

    setIsPrinting(true);
    try {
      const success = await BluetoothPrinterService.printReceipt(transaction, customer, storeName);
      
      if (success) {
        toast.success('Receipt printed successfully');
      } else {
        toast.error('Failed to print receipt');
      }
      
      return success;
    } catch (error) {
      console.error('Failed to print receipt:', error);
      toast.error('Printing failed');
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
      const success = await BluetoothPrinterService.printTestReceipt();
      
      if (success) {
        toast.success('Test receipt printed');
      } else {
        toast.error('Failed to print test receipt');
      }
      
      return success;
    } catch (error) {
      console.error('Failed to print test receipt:', error);
      toast.error('Test print failed');
      return false;
    } finally {
      setIsPrinting(false);
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
    checkAvailability
  };
}
