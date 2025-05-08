
import React, { useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Copy, Download } from "lucide-react";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";

interface QRCodeDisplayProps {
  qrValue: string;
  storeName?: string;
}

export const QRCodeDisplay = ({ qrValue, storeName }: QRCodeDisplayProps) => {
  const qrRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  
  const downloadQRCode = () => {
    if (!qrRef.current) return;
    
    const canvas = qrRef.current.querySelector("canvas");
    if (!canvas) return;
    
    const url = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    
    link.href = url;
    link.download = `${storeName ? storeName.replace(/\s+/g, '-') : 'store'}-QR-Code.png`;
    link.click();
    
    toast.success("QR code downloaded successfully");
  };
  
  const copyLink = () => {
    navigator.clipboard.writeText(qrValue)
      .then(() => toast.success("Link copied to clipboard"))
      .catch(() => toast.error("Failed to copy link"));
  };
  
  const qrSize = isMobile ? 200 : 250;
  
  return (
    <div className="flex flex-col items-center">
      <div 
        ref={qrRef} 
        className="bg-white p-4 rounded-lg shadow-sm mb-6"
      >
        <QRCodeCanvas
          value={qrValue}
          size={qrSize}
          level="H"
          includeMargin={true}
        />
      </div>
      
      <div className="text-center mb-4 max-w-md">
        <p className="text-sm text-gray-500">
          Customers can scan this QR code to sign up for your loyalty program.
          They'll be asked to provide their name, phone, and email.
        </p>
      </div>
      
      <div className="flex flex-col sm:flex-row w-full max-w-md space-y-2 sm:space-y-0">
        <div className="flex items-center border rounded-md pl-3 pr-1 py-1 w-full">
          <input
            type="text"
            value={qrValue}
            readOnly
            className="flex-1 outline-none text-sm bg-transparent"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={copyLink}
            className="text-croffle-primary h-8 px-2"
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={downloadQRCode}
          className="ml-0 sm:ml-2 flex items-center justify-center"
        >
          <Download className="mr-1 h-4 w-4" />
          Download
        </Button>
      </div>
    </div>
  );
};
