
import { useState, useEffect, useCallback } from 'react';
import { BluetoothPrinterService } from '@/services/printer/BluetoothPrinterService';
import { PrinterDiscovery, BluetoothPrinter, ThermalPrinter } from '@/services/printer/PrinterDiscovery';
import { BluetoothReconnectionService, ConnectionState } from '@/services/printer/BluetoothReconnectionService';
import { PrinterStorageService, StoredPrinterInfo } from '@/services/printer/PrinterStorageService';
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
  const [storedPrinter, setStoredPrinter] = useState<StoredPrinterInfo | null>(null);
  const [isQuickReconnecting, setIsQuickReconnecting] = useState(false);

  useEffect(() => {
    // Initialize the reconnection service
    BluetoothReconnectionService.initialize();
    
    // Check for stored printer on mount
    const stored = PrinterStorageService.getLastPrinter();
    setStoredPrinter(stored);
    
    checkAvailability();

    // Subscribe to reconnection service state changes
    const unsubscribe = BluetoothReconnectionService.subscribeToStateChanges(
      (state, printer) => {
        switch (state) {
          case ConnectionState.CONNECTED:
            setIsConnected(true);
            setConnectedPrinter(printer);
            // Update stored printer when connected
            setStoredPrinter(PrinterStorageService.getLastPrinter());
            break;
          case ConnectionState.DISCONNECTED:
          case ConnectionState.RECONNECT_FAILED:
            setIsConnected(false);
            break;
          case ConnectionState.RECONNECTING:
            // Keep current state during reconnection
            break;
        }
      }
    );

    return () => unsubscribe();
  }, []);

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
      } else {
        console.log('❌ Bluetooth thermal printing not available');
        // Try to get more specific error information
        try {
          await PrinterDiscovery.initialize();
        } catch (initError: any) {
          console.error('🔧 Bluetooth initialization error details:', initError.message);

          // Show specific error messages to help user troubleshoot
          if (initError.message?.includes('Location permissions')) {
            toast.error('Location permissions required', {
              description: 'Please enable Location permissions in device settings for Bluetooth scanning'
            });
          } else if (initError.message?.includes('Bluetooth permissions')) {
            toast.error('Bluetooth permissions required', {
              description: 'Please enable Bluetooth permissions in device settings'
            });
          } else if (initError.message?.includes('not enabled')) {
            toast.error('Bluetooth not enabled', {
              description: 'Please enable Bluetooth in your device settings'
            });
          } else if (initError.message?.includes('not supported')) {
            toast.error('Bluetooth not supported', {
              description: 'This device does not support Bluetooth LE'
            });
          }
        }
      }
    } catch (error: any) {
      console.error('❌ Failed to check printer availability:', error);
      setIsAvailable(false);

      // Show user-friendly error message
      toast.error('Bluetooth check failed', {
        description: error.message || 'Unable to check Bluetooth availability'
      });
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
        
        // Setup disconnection listeners for automatic reconnection
        BluetoothReconnectionService.setupDisconnectionListeners(printer);
        
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

  const quickReconnect = async (): Promise<boolean> => {
    if (!storedPrinter) {
      toast.error('No saved printer found');
      return false;
    }

    setIsQuickReconnecting(true);
    try {
      toast.info(`Reconnecting to ${storedPrinter.name}...`);
      const printer = await PrinterDiscovery.quickReconnect();
      
      if (printer) {
        setIsConnected(true);
        setConnectedPrinter(printer);
        BluetoothReconnectionService.setupDisconnectionListeners(printer);
        toast.success(`Reconnected to ${printer.name}`);
        return true;
      } else {
        toast.error('Could not reconnect to printer');
        return false;
      }
    } catch (error: any) {
      console.error('Quick reconnect failed:', error);
      if (error.name !== 'NotFoundError') {
        toast.error(`Reconnect failed: ${error.message || 'Unknown error'}`);
      }
      return false;
    } finally {
      setIsQuickReconnecting(false);
    }
  };

  const printReceipt = useCallback(async (
    transaction: Transaction,
    customer?: Customer | null,
    store?: Store,
    cashierName?: string
  ) => {
    if (!isConnected) {
      toast.error('No printer connected');
      return false;
    }

    console.log('🖨️ [PRINT-RECEIPT] Starting print...', {
      isOnline: navigator.onLine,
      hasTransaction: !!transaction,
      receiptNumber: transaction?.receiptNumber,
      hasStore: !!store,
      storeName: store?.name
    });

    // Validate connected printer state
    const printer = PrinterDiscovery.getConnectedPrinter();
    if (!printer?.isConnected) {
      toast.error('Printer connection lost. Please reconnect.');
      setIsConnected(false);
      return false;
    }

    setIsPrinting(true);
    try {
      console.log(`🖨️ [PRINT-RECEIPT] Sending to BluetoothPrinterService for: ${transaction.receiptNumber}`);
      toast.info('Sending receipt to printer...');

      const success = await BluetoothPrinterService.printReceipt(transaction, customer, store, cashierName);

      if (success) {
        toast.success('Receipt sent to printer successfully!');
        console.log(`✅ [PRINT-RECEIPT] Print success: ${transaction.receiptNumber}`);
      } else {
        toast.error('Failed to send receipt to printer');
        console.error(`❌ [PRINT-RECEIPT] Print failed: ${transaction.receiptNumber}`);
      }

      return success;
    } catch (error: any) {
      console.error('Failed to print receipt:', error);

      // Provide specific error messages based on error type
      if (error.message?.includes('not connected') || error.message?.includes('Connection lost')) {
        toast.error('Printer disconnected. Please reconnect and try again.');
        setIsConnected(false);
      } else if (error.message?.includes('service')) {
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
  }, [isConnected]);

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

  const printZReading = async (zReadingData: any, isReprint?: boolean) => {
    if (!isConnected) {
      toast.error('No printer connected');
      return false;
    }

    setIsPrinting(true);
    try {
      console.log('Starting Z-Reading print...', { isReprint: !!isReprint });
      toast.info(isReprint ? 'Reprinting Z-Reading...' : 'Sending Z-Reading to printer...');

      const success = await BluetoothPrinterService.printZReading(zReadingData, isReprint);

      if (success) {
        toast.success('Z-Reading sent to printer successfully!');
        console.log('✅ Z-Reading printed successfully');
      } else {
        toast.error('Failed to send Z-Reading to printer');
        console.error('❌ Z-Reading printing failed');
      }

      return success;
    } catch (error: any) {
      console.error('Failed to print Z-Reading:', error);

      // Provide specific error messages based on error type
      if (error.message?.includes('service')) {
        toast.error('Printer service not found. Check printer compatibility.');
      } else if (error.message?.includes('characteristic')) {
        toast.error('Printer communication failed. Try reconnecting.');
      } else if (error.message?.includes('write')) {
        toast.error('Failed to send data to printer. Check connection.');
      } else {
        toast.error(`Z-Reading print failed: ${error.message || 'Unknown error'}`);
      }

      return false;
    } finally {
      setIsPrinting(false);
    }
  };

  const printXReading = async (xReadingData: any, isReprint?: boolean) => {
    if (!isConnected) {
      toast.error('No printer connected');
      return false;
    }

    setIsPrinting(true);
    try {
      console.log('Starting X-Reading print...', { isReprint: !!isReprint });
      toast.info(isReprint ? 'Reprinting X-Reading...' : 'Sending X-Reading to printer...');

      const success = await BluetoothPrinterService.printXReading(xReadingData, isReprint);

      if (success) {
        toast.success('X-Reading sent to printer successfully!');
        console.log('✅ X-Reading printed successfully');
      } else {
        toast.error('Failed to send X-Reading to printer');
        console.error('❌ X-Reading printing failed');
      }

      return success;
    } catch (error: any) {
      console.error('Failed to print X-Reading:', error);

      if (error.message?.includes('service')) {
        toast.error('Printer service not found. Check printer compatibility.');
      } else if (error.message?.includes('characteristic')) {
        toast.error('Printer communication failed. Try reconnecting.');
      } else if (error.message?.includes('write')) {
        toast.error('Failed to send data to printer. Check connection.');
      } else {
        toast.error(`X-Reading print failed: ${error.message || 'Unknown error'}`);
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
    storedPrinter,
    isQuickReconnecting,
    scanForPrinters,
    connectToPrinter,
    disconnectPrinter,
    quickReconnect,
    printReceipt,
    printTestReceipt,
    printZReading,
    printXReading,
    testServiceDiscovery,
    checkAvailability
  };
}
