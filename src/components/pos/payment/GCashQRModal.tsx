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
        
        <div className="bg-gradient-to-b from-blue-600 to-blue-700 p-6 rounded-t-lg">
          <div className="text-center text-white">
            <h3 className="text-xl font-bold mb-1">GCash</h3>
            <p className="text-blue-100 text-sm">
              {storeName || "Merchant"} - Pay via QR
            </p>
          </div>
        </div>
        
        <div className="bg-white p-6 space-y-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-800 mb-2">
              {formatCurrency(total)}
            </p>
            <p className="text-sm text-gray-600">
              Scan QR code with your GCash app
            </p>
          </div>
          
          <div className="flex justify-center bg-gray-50 p-4 rounded-lg">
            <img 
              src={gcashQRImage} 
              alt="GCash QR Code" 
              className="w-56 h-56 object-contain"
            />
          </div>
          
          <div className="text-center space-y-2">
            <p className="text-xs text-gray-500">
              Open GCash → Scan → Point camera at QR code
            </p>
            <div className="flex items-center justify-center space-x-2 text-xs text-gray-400">
              <span>Powered by</span>
              <span className="font-semibold text-blue-600">GCash</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}