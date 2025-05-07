
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Store } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Download, QrCode, Copy, Link } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";

export default function StoreQR() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qrRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [store, setStore] = useState<Store | null>(null);
  const [qrValue, setQrValue] = useState("");
  const appUrl = window.location.origin;
  
  useEffect(() => {
    if (id) {
      fetchStore();
    }
  }, [id]);
  
  useEffect(() => {
    if (store) {
      const url = `${appUrl}/customer-form/${store.id}`;
      setQrValue(url);
    }
  }, [store, appUrl]);
  
  const fetchStore = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("stores")
        .select("*")
        .eq("id", id)
        .single();
        
      if (error) throw error;
      
      setStore(data as Store);
    } catch (error: any) {
      console.error("Error fetching store:", error);
      toast.error("Failed to load store details");
      navigate("/stores");
    } finally {
      setIsLoading(false);
    }
  };
  
  const downloadQRCode = () => {
    if (!qrRef.current) return;
    
    const canvas = qrRef.current.querySelector("canvas");
    if (!canvas) return;
    
    const url = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    
    link.href = url;
    link.download = `${store?.name.replace(/\s+/g, '-')}-QR-Code.png`;
    link.click();
    
    toast.success("QR code downloaded successfully");
  };
  
  const copyLink = () => {
    navigator.clipboard.writeText(qrValue)
      .then(() => toast.success("Link copied to clipboard"))
      .catch(() => toast.error("Failed to copy link"));
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
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-croffle-primary">Store QR Code</h1>
          <p className="text-gray-500">
            Generate a QR code for customers to scan and join your loyalty program
          </p>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">
              QR Code for {store?.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div 
              ref={qrRef} 
              className="bg-white p-4 rounded-lg shadow-sm mb-6"
            >
              <QRCodeCanvas
                value={qrValue}
                size={250}
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
            
            <div className="flex items-center border rounded-md pl-3 pr-1 py-1 w-full max-w-md">
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
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => navigate("/stores")}
            >
              <Link className="mr-2 h-4 w-4" />
              Back to Stores
            </Button>
            
            <div className="space-x-2">
              <Button
                variant="outline"
                onClick={() => navigate(`/stores/${id}/qr/preview`)}
              >
                <QrCode className="mr-2 h-4 w-4" />
                Preview Form
              </Button>
              <Button
                className="bg-croffle-primary hover:bg-croffle-primary/90"
                onClick={downloadQRCode}
              >
                <Download className="mr-2 h-4 w-4" />
                Download QR
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
