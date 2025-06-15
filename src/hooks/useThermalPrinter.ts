
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
  }, []);

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
      const printers = await PrinterDiscovery.scanForPrinters();
      setAvailablePrinters(printers);
      
      if (printers.length === 0) {
        toast.info('No thermal printers found. Make sure your printer is on and in pairing mode.');
      } else {
        toast.success(`Found ${printers.length} printer(s)`);
      }
    } catch (error) {
      console.error('Failed to scan for printers:', error);
      toast.error('Failed to scan for printers');
    } finally {
      setIsScanning(false);
    }
  };

  const connectToPrinter = async (printer: ThermalPrinter) => {
    try {
      const success = await PrinterDiscovery.connectToPrinter(printer);
      
      if (success) {
        setIsConnected(true);
        setConnectedPrinter(printer);
        toast.success(`Connected to ${printer.name}`);
      } else {
        toast.error(`Failed to connect to ${printer.name}`);
      }
      
      return success;
    } catch (error) {
      console.error('Failed to connect to printer:', error);
      toast.error('Connection failed');
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
