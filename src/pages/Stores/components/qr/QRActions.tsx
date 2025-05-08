
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Link, QrCode, Download } from "lucide-react";

interface QRActionsProps {
  storeId: string | undefined;
  onDownload: () => void;
}

export const QRActions = ({ storeId, onDownload }: QRActionsProps) => {
  const navigate = useNavigate();
  
  return (
    <div className="flex justify-between">
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
          onClick={() => navigate(`/stores/${storeId}/qr/preview`)}
        >
          <QrCode className="mr-2 h-4 w-4" />
          Preview Form
        </Button>
        <Button
          className="bg-croffle-primary hover:bg-croffle-primary/90"
          onClick={onDownload}
        >
          <Download className="mr-2 h-4 w-4" />
          Download QR
        </Button>
      </div>
    </div>
  );
};
