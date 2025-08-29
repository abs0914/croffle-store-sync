import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, RefreshCw, Image, AlertTriangle, CheckCircle } from 'lucide-react';
import { useUnifiedProducts } from '@/hooks/unified/useUnifiedProducts';
import { useStore } from '@/contexts/StoreContext';
interface ImageStatus {
  productId: string;
  productName: string;
  imageUrl: string | null;
  status: 'loading' | 'success' | 'error' | 'missing';
  lastChecked: Date;
}
export const POSImageDebugPanel: React.FC = () => {
  const {
    currentStore
  } = useStore();
  const {
    allProducts
  } = useUnifiedProducts({
    storeId: currentStore?.id || null,
    autoRefresh: false
  });
  const [isOpen, setIsOpen] = useState(false);
  const [imageStatuses, setImageStatuses] = useState<ImageStatus[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const checkImageStatuses = async () => {
    if (!allProducts.length) return;
    setIsChecking(true);
    const statuses: ImageStatus[] = [];
    for (const product of allProducts) {
      const status: ImageStatus = {
        productId: product.id,
        productName: product.name,
        imageUrl: product.image_url || null,
        status: product.image_url ? 'loading' : 'missing',
        lastChecked: new Date()
      };
      if (product.image_url) {
        try {
          const response = await fetch(product.image_url, {
            method: 'HEAD'
          });
          status.status = response.ok ? 'success' : 'error';
        } catch (error) {
          status.status = 'error';
        }
      }
      statuses.push(status);
    }
    setImageStatuses(statuses);
    setIsChecking(false);
  };
  useEffect(() => {
    if (isOpen && allProducts.length > 0) {
      checkImageStatuses();
    }
  }, [isOpen, allProducts.length]);
  const stats = {
    total: imageStatuses.length,
    success: imageStatuses.filter(s => s.status === 'success').length,
    error: imageStatuses.filter(s => s.status === 'error').length,
    missing: imageStatuses.filter(s => s.status === 'missing').length
  };
  const getStatusIcon = (status: ImageStatus['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'missing':
        return <Image className="w-4 h-4 text-gray-400" />;
      default:
        return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
    }
  };
  const getStatusBadge = (status: ImageStatus['status']) => {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="bg-green-100 text-green-800">Valid</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      case 'missing':
        return <Badge variant="secondary">No Image</Badge>;
      default:
        return <Badge variant="outline">Checking...</Badge>;
    }
  };
  if (!currentStore) return null;
  return <Card className="fixed bottom-4 right-4 w-80 max-h-96 z-50 shadow-lg">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {/* Stats */}
              <div className="grid grid-cols-4 gap-2 text-xs">
                <div className="text-center">
                  <div className="font-medium">{stats.total}</div>
                  
                </div>
                <div className="text-center">
                  <div className="font-medium text-green-600">{stats.success}</div>
                  <div className="text-muted-foreground">Valid</div>
                </div>
                <div className="text-center">
                  <div className="font-medium text-red-600">{stats.error}</div>
                  <div className="text-muted-foreground">Errors</div>
                </div>
                <div className="text-center">
                  <div className="font-medium text-gray-500">{stats.missing}</div>
                  <div className="text-muted-foreground">Missing</div>
                </div>
              </div>

              {/* Refresh Button */}
              <Button onClick={checkImageStatuses} disabled={isChecking} size="sm" className="w-full">
                {isChecking ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                Check Images
              </Button>

              {/* Image List */}
              {imageStatuses.length > 0 && <div className="max-h-48 overflow-y-auto space-y-2">
                  {imageStatuses.filter(status => status.status === 'error' || status.status === 'missing').slice(0, 10).map(status => <div key={status.productId} className="flex items-center gap-2 p-2 rounded border bg-muted/30">
                      {getStatusIcon(status.status)}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-xs truncate">
                          {status.productName}
                        </div>
                        {status.imageUrl && <div className="text-xs text-muted-foreground truncate">
                            {status.imageUrl}
                          </div>}
                      </div>
                      {getStatusBadge(status.status)}
                    </div>)}
                  
                  {imageStatuses.filter(s => s.status === 'error' || s.status === 'missing').length === 0 && <div className="text-center text-sm text-muted-foreground py-4">
                      All images are valid! 🎉
                    </div>}
                </div>}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>;
};