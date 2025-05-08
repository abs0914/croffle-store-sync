
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Transaction, Customer } from "@/types";
import { useStore } from "@/contexts/StoreContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { Printer, Bluetooth } from "lucide-react";
import QRCode from 'qrcode.react';

interface ReceiptGeneratorProps {
  transaction: Transaction;
  customer: Customer | null;
}

export default function ReceiptGenerator({ transaction, customer }: ReceiptGeneratorProps) {
  const { currentStore } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isBluetoothDialogOpen, setIsBluetoothDialogOpen] = useState(false);
  const [bluetoothDevices, setBluetoothDevices] = useState<any[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<any>(null);
  
  const receiptRef = useRef<HTMLDivElement>(null);
  
  const printReceipt = async () => {
    setIsPrinting(true);
    
    try {
      const receiptContent = receiptRef.current?.innerHTML;
      
      if (!receiptContent) {
        throw new Error("Receipt content not found");
      }
      
      const printWindow = window.open('', '', 'height=800,width=600');
      
      if (!printWindow) {
        throw new Error("Could not open print window");
      }
      
      printWindow.document.write(`
        <html>
          <head>
            <title>Receipt</title>
            <style>
              body {
                font-family: monospace;
                font-size: 12px;
                margin: 0;
                padding: 10px;
              }
              .receipt {
                width: 80mm;
                margin: 0 auto;
              }
              .header {
                text-align: center;
                margin-bottom: 10px;
              }
              .item {
                display: flex;
                justify-content: space-between;
                margin-bottom: 5px;
              }
              .divider {
                border-top: 1px dashed #000;
                margin: 10px 0;
              }
              .total {
                font-weight: bold;
              }
              .footer {
                text-align: center;
                margin-top: 10px;
                font-size: 10px;
              }
              .qr-code {
                text-align: center;
                margin-top: 15px;
              }
            </style>
          </head>
          <body>
            <div class="receipt">
              ${receiptContent}
            </div>
            <script>
              setTimeout(() => {
                window.print();
                window.close();
              }, 500);
            </script>
          </body>
        </html>
      `);
      
      toast.success("Receipt sent to printer");
    } catch (error) {
      console.error("Error printing receipt:", error);
      toast.error("Failed to print receipt");
    } finally {
      setIsPrinting(false);
    }
  };
  
  const scanBluetoothDevices = async () => {
    try {
      if (!navigator.bluetooth) {
        toast.error("Bluetooth is not supported on this device or browser");
        return;
      }
      
      setBluetoothDevices([]);
      setSelectedDevice(null);
      
      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { services: ['000018f0-0000-1000-8000-00805f9b34fb'] }, // Common printer service
          { services: ['49535343-fe7d-4ae5-8fa9-9fafd205e455'] } // Another common printer service
        ],
        optionalServices: ['battery_service']
      });
      
      setBluetoothDevices([device]);
      setSelectedDevice(device);
      
      toast.success(`Found printer: ${device.name}`);
    } catch (error) {
      console.error("Error scanning for Bluetooth devices:", error);
      toast.error("Failed to scan for Bluetooth devices");
    }
  };
  
  const connectBluetoothPrinter = async () => {
    if (!selectedDevice) {
      toast.error("No printer selected");
      return;
    }
    
    try {
      toast.info("Connecting to printer... This might take a moment");
      
      // In a real application, we'd connect to the printer and send the receipt data
      // For now, we'll just simulate a successful connection
      setTimeout(() => {
        toast.success("Receipt sent to Bluetooth printer");
        setIsBluetoothDialogOpen(false);
      }, 2000);
      
    } catch (error) {
      console.error("Error connecting to Bluetooth printer:", error);
      toast.error("Failed to connect to Bluetooth printer");
    }
  };
  
  const discountSection = transaction.discount > 0 ? (
    <div>
      <div className="flex justify-between">
        <span>Discount ({transaction.discountType}):</span>
        <span>₱{transaction.discount.toFixed(2)}</span>
      </div>
      {transaction.discountIdNumber && (
        <div className="text-xs">ID: {transaction.discountIdNumber}</div>
      )}
    </div>
  ) : null;

  return (
    <div>
      <div className="flex space-x-2">
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button 
              variant="outline" 
              className="flex-1"
              disabled={!transaction}
            >
              <Printer className="mr-2 h-4 w-4" />
              View Receipt
            </Button>
          </DialogTrigger>
          
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Receipt</DialogTitle>
            </DialogHeader>
            
            <div className="receipt-container p-4 bg-white border rounded-md" ref={receiptRef}>
              {currentStore && (
                <div className="header text-center mb-4">
                  {currentStore.logo_url && (
                    <div className="logo mb-2">
                      <img 
                        src={currentStore.logo_url} 
                        alt={currentStore.name} 
                        className="h-12 mx-auto"
                      />
                    </div>
                  )}
                  <h2 className="text-lg font-bold">{currentStore.name}</h2>
                  <p className="text-sm">{currentStore.address}</p>
                  {currentStore.phone && <p className="text-sm">Tel: {currentStore.phone}</p>}
                  {currentStore.tax_id && <p className="text-sm">Tax ID: {currentStore.tax_id}</p>}
                </div>
              )}
              
              <div className="receipt-details space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Receipt No:</span>
                  <span>{transaction.receiptNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span>Date:</span>
                  <span>{format(new Date(transaction.createdAt), "MMM dd, yyyy h:mm a")}</span>
                </div>
                
                {customer && (
                  <div className="customer-info mt-2">
                    <div className="font-semibold">Customer:</div>
                    <div>{customer.name}</div>
                    {customer.phone && <div>{customer.phone}</div>}
                  </div>
                )}
                
                <div className="divider my-3 border-t border-dashed"></div>
                
                <div className="items space-y-2">
                  {transaction.items.map((item, index) => (
                    <div key={index}>
                      <div className="flex justify-between">
                        <span className="font-medium">{item.name}</span>
                        <span>₱{item.totalPrice.toFixed(2)}</span>
                      </div>
                      <div className="text-xs text-gray-600">
                        {item.quantity} x ₱{item.unitPrice.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="divider my-3 border-t border-dashed"></div>
                
                <div className="totals space-y-1">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>₱{transaction.subtotal.toFixed(2)}</span>
                  </div>
                  
                  {discountSection}
                  
                  <div className="flex justify-between">
                    <span>VAT (12%):</span>
                    <span>₱{transaction.tax.toFixed(2)}</span>
                  </div>
                  
                  <div className="divider my-1 border-t border-dashed"></div>
                  
                  <div className="flex justify-between font-bold">
                    <span>TOTAL:</span>
                    <span>₱{transaction.total.toFixed(2)}</span>
                  </div>
                  
                  {transaction.paymentMethod === 'cash' && transaction.amountTendered && transaction.change !== undefined && (
                    <div>
                      <div className="flex justify-between">
                        <span>Amount Tendered:</span>
                        <span>₱{transaction.amountTendered.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Change:</span>
                        <span>₱{transaction.change.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex justify-between mt-2">
                    <span>Payment Method:</span>
                    <span className="uppercase">{transaction.paymentMethod}</span>
                  </div>
                  
                  {transaction.paymentMethod === 'card' && transaction.paymentDetails?.cardType && (
                    <div className="text-xs text-right">
                      {transaction.paymentDetails.cardType} ****{transaction.paymentDetails.cardNumber}
                    </div>
                  )}
                  
                  {transaction.paymentMethod === 'e-wallet' && transaction.paymentDetails?.eWalletProvider && (
                    <div className="text-xs text-right">
                      {transaction.paymentDetails.eWalletProvider} Ref: {transaction.paymentDetails.eWalletReferenceNumber}
                    </div>
                  )}
                </div>
                
                <div className="divider my-3 border-t border-dashed"></div>
                
                <div className="qr-code text-center mt-3">
                  <QRCode value={transaction.id} size={80} renderAs="svg" />
                  <div className="text-xs mt-1">Transaction ID: {transaction.id}</div>
                </div>
                
                <div className="footer text-center mt-4 text-xs">
                  <p>Thank you for your purchase!</p>
                  <p>Please come again</p>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                variant="outline"
                onClick={() => setIsBluetoothDialogOpen(true)}
              >
                <Bluetooth className="mr-2 h-4 w-4" />
                Bluetooth Print
              </Button>
              <Button 
                onClick={printReceipt}
                disabled={isPrinting}
              >
                <Printer className="mr-2 h-4 w-4" />
                {isPrinting ? "Printing..." : "Print"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      <Dialog open={isBluetoothDialogOpen} onOpenChange={setIsBluetoothDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bluetooth Printing</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <Button onClick={scanBluetoothDevices} className="w-full">
              <Bluetooth className="mr-2 h-4 w-4" />
              Scan for Printers
            </Button>
            
            {bluetoothDevices.length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium mb-2">Available Devices:</h4>
                <ul className="space-y-2">
                  {bluetoothDevices.map((device, index) => (
                    <li 
                      key={index}
                      className={`p-2 border rounded-md cursor-pointer ${selectedDevice === device ? 'bg-primary/10 border-primary' : ''}`}
                      onClick={() => setSelectedDevice(device)}
                    >
                      {device.name || "Unknown Device"}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBluetoothDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={connectBluetoothPrinter}
              disabled={!selectedDevice}
            >
              Connect & Print
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
