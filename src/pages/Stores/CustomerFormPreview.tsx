
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { useStoreQR } from "./hooks/useStoreQR";

export default function CustomerFormPreview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { store, qrValue, isLoading, error } = useStoreQR();
  
  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[300px]">
          <Loader2 className="h-8 w-8 animate-spin text-croffle-primary mb-4" />
          <p className="text-gray-500">Loading preview...</p>
        </div>
      </div>
    );
  }
  
  if (error || !store) {
    return (
      <div className="container mx-auto py-6">
        <div className="max-w-2xl mx-auto">
          <Button
            variant="outline"
            onClick={() => navigate(`/stores/${id}/qr`)}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to QR Code
          </Button>
          
          <Card className="shadow-md">
            <CardHeader className="text-center pb-3">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-2" />
              <CardTitle className="text-lg text-red-500">Error Loading Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-gray-600">
                {error || "Unable to load store information. Please try again."}
              </p>
            </CardContent>
            <CardFooter className="flex justify-center">
              <Button 
                onClick={() => navigate(`/stores/${id}/qr`)}
                variant="outline"
              >
                Go Back
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-croffle-primary">Customer Form Preview</h1>
          <p className="text-gray-500">
            This is how customers will see your signup form when they scan the QR code
          </p>
        </div>
        
        <div className="flex justify-between mb-4">
          <Button
            variant="outline"
            onClick={() => navigate(`/stores/${id}/qr`)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to QR Code
          </Button>
          
          <Button
            onClick={() => window.open(qrValue, '_blank')}
            className="bg-croffle-primary hover:bg-croffle-primary/90"
          >
            Open Form in New Tab
          </Button>
        </div>
        
        <Card className="mb-6 shadow-md">
          <CardHeader className="border-b pb-3">
            <CardTitle className="text-lg">Form Preview</CardTitle>
          </CardHeader>
          <CardContent className="py-4">
            <div className="border rounded-md p-2 overflow-hidden">
              <iframe 
                src={qrValue}
                title="Customer Form Preview"
                className="w-full border-none"
                style={{ height: '600px' }}
              />
            </div>
          </CardContent>
          <CardFooter className="border-t pt-3">
            <p className="text-sm text-gray-500">
              This is a preview of how your form will appear to customers when they scan the QR code.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
