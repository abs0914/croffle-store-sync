import { useState, useEffect } from 'react';
import { BluetoothReconnectionService, ConnectionState } from '@/services/printer/BluetoothReconnectionService';
import { BluetoothPrinter } from '@/services/printer/PrinterDiscovery';

export function useBluetoothReconnection() {
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    BluetoothReconnectionService.getCurrentState()
  );
  const [currentPrinter, setCurrentPrinter] = useState<BluetoothPrinter | null>(null);

  useEffect(() => {
    const unsubscribe = BluetoothReconnectionService.subscribeToStateChanges(
      (state, printer) => {
        setConnectionState(state);
        setCurrentPrinter(printer);
      }
    );

    return () => unsubscribe();
  }, []);

  const manualReconnect = async () => {
    if (currentPrinter) {
      return await BluetoothReconnectionService.manualReconnect(currentPrinter);
    }
    return false;
  };

  return {
    connectionState,
    currentPrinter,
    manualReconnect,
    isConnected: connectionState === ConnectionState.CONNECTED,
    isReconnecting: connectionState === ConnectionState.RECONNECTING,
    isDisconnected: connectionState === ConnectionState.DISCONNECTED,
    reconnectFailed: connectionState === ConnectionState.RECONNECT_FAILED
  };
}
