import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, QrCode } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Store } from '@/types';

export default function AdminStoreQR() {
  const navigate = useNavigate();
  const { id } = useParams();
  
  const [store, setStore] = useState<Store | null>(null);
  const [qrValue, setQrValue] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadStore();
    }
  }, [id]);

  const loadStore = async () => {
    if (!id) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      setStore(data as Store);
      
      // Generate QR value - could be store URL, ID, or other data
      setQrValue(`https://your-domain.com/stores/${data.id}`);
    } catch (error) {
      console.error('Error loading store:', error);
      toast.error('Failed to load store');
    } finally {
      setIsLoading(false);
    }
  };

  const downloadQR = () => {
    // This would typically use a QR code library to generate and download
    // For now, just show a placeholder
    toast.info('QR code download functionality would be implemented here');
  };

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  if (!store) {
    return <div className="flex justify-center p-8">Store not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => navigate('/admin/stores')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Stores
        </Button>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <QrCode className="h-6 w-6" />
          QR Code: {store.name}
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Store QR Code</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col items-center space-y-4">
            {/* QR Code would be rendered here */}
            <div className="w-64 h-64 border-2 border-dashed border-gray-300 flex items-center justify-center">
              <div className="text-center">
                <QrCode className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-500">QR Code Preview</p>
                <p className="text-xs text-gray-400 mt-1">{qrValue}</p>
              </div>
            </div>
            
            <Button onClick={downloadQR}>
              <Download className="h-4 w-4 mr-2" />
              Download QR Code
            </Button>
          </div>
          
          <div className="mt-6">
            <h3 className="font-semibold mb-2">Store Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Name:</span> {store.name}
              </div>
              <div>
                <span className="font-medium">Address:</span> {store.address}
              </div>
              <div>
                <span className="font-medium">Phone:</span> {store.phone || 'N/A'}
              </div>
              <div>
                <span className="font-medium">Email:</span> {store.email || 'N/A'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}