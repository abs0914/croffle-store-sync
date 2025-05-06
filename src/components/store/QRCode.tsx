
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Download } from "lucide-react";

interface QRCodeProps {
  storeId: string;
  storeName: string;
}

export default function QRCode({ storeId, storeName }: QRCodeProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const generateQRCode = async () => {
      setIsLoading(true);
      try {
        // Generate QR code URL using a third-party API
        // For simplicity, we'll use a free service
        const encodedData = encodeURIComponent(`https://yourapp.com/store/${storeId}`);
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodedData}&color=4A237E`;
        setQrCodeUrl(qrUrl);
      } catch (error) {
        console.error("Error generating QR code:", error);
      } finally {
        setIsLoading(false);
      }
    };

    generateQRCode();
  }, [storeId]);

  const handleDownload = () => {
    if (!qrCodeUrl) return;

    // Create a link element
    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = `${storeName}-qrcode.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <div className="border p-4 rounded-lg bg-white">
        {qrCodeUrl ? (
          <img
            src={qrCodeUrl}
            alt={`QR Code for ${storeName}`}
            className="w-[200px] h-[200px]"
          />
        ) : (
          <div className="w-[200px] h-[200px] flex items-center justify-center bg-gray-100">
            QR Code generation failed
          </div>
        )}
      </div>
      <Button
        onClick={handleDownload}
        className="mt-4 flex items-center"
        disabled={!qrCodeUrl}
      >
        <Download className="mr-2 h-4 w-4" />
        Download QR Code
      </Button>
    </div>
  );
}
