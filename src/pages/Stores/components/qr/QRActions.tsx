
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { ArrowLeft, QrCode, Download, Eye } from "lucide-react";

interface QRActionsProps {
  storeId: string | undefined;
  onDownload: () => void;
}

export const QRActions = ({ storeId, onDownload }: QRActionsProps) => {
  const navigate = useNavigate();
  
  return (
    <div className="flex flex-col sm:flex-row justify-between gap-2">
      <Button
        variant="outline"
        onClick={() => navigate("/stores")}
        className="flex-shrink-0"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Stores
      </Button>
      
      <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
        <Button
          variant="outline"
          onClick={() => navigate(`/stores/${storeId}/qr/preview`)}
        >
          <Eye className="mr-2 h-4 w-4" />
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
