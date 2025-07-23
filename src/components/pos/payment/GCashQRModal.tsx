import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCurrency } from "@/utils/format";
import gcashQRImage from "@/assets/gcash-qr.png";

interface GCashQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  total: number;
  storeName?: string;
}

export function GCashQRModal({ isOpen, onClose, total, storeName }: GCashQRModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">
            GCash Payment - {formatCurrency(total)}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center space-y-4 p-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">
              {storeName && `${storeName} - `}Scan QR Code to Pay
            </p>
            <p className="text-lg font-semibold">
              Amount: {formatCurrency(total)}
            </p>
          </div>
          
          <div className="flex justify-center">
            <img 
              src={gcashQRImage} 
              alt="GCash QR Code" 
              className="w-64 h-64 object-contain"
            />
          </div>
          
          <p className="text-xs text-muted-foreground text-center">
            Show this QR code to the customer to scan with their GCash app
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}