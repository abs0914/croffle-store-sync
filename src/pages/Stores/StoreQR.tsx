
import React, { useRef } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useStoreQR } from "./hooks/useStoreQR";
import { QRHeader } from "./components/qr/QRHeader";
import { QRCodeDisplay } from "./components/qr/QRCodeDisplay";
import { QRActions } from "./components/qr/QRActions";

export default function StoreQR() {
  const { isLoading, store, qrValue } = useStoreQR();
  const qrRef = useRef<HTMLDivElement>(null);
  
  const handleDownload = () => {
    if (!qrRef.current) return;
    
    const canvas = qrRef.current.querySelector("canvas");
    if (!canvas) return;
    
    const url = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    
    link.href = url;
    link.download = `${store?.name.replace(/\s+/g, '-')}-QR-Code.png`;
    link.click();
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full py-12">
        <Loader2 className="h-8 w-8 animate-spin text-croffle-primary" />
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-6">
      <div className="max-w-2xl mx-auto">
        <QRHeader store={store} />
        
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">
              QR Code for {store?.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div ref={qrRef}>
              <QRCodeDisplay qrValue={qrValue} storeName={store?.name} />
            </div>
          </CardContent>
          <CardFooter>
            <QRActions storeId={store?.id} onDownload={handleDownload} />
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
