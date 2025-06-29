
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Database, RefreshCw, Upload } from 'lucide-react';
import { 
  checkLocalStorageForCommissaryData, 
  syncLocalDataToSupabase, 
  updateExistingItemsToOrderable 
} from '@/utils/commissaryDataSync';

export function DataSyncPanel() {
  const [loading, setLoading] = useState(false);
  const [localData, setLocalData] = useState<any>(null);

  const handleCheckLocalData = () => {
    const data = checkLocalStorageForCommissaryData();
    setLocalData(data);
  };

  const handleSyncLocalData = async () => {
    if (!localData) return;
    
    setLoading(true);
    try {
      // Find the most likely array of items to sync
      const dataArrays = Object.values(localData).filter(Array.isArray);
      if (dataArrays.length > 0) {
        await syncLocalDataToSupabase(dataArrays[0]);
      } else {
        console.log('No array data found to sync');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateExisting = async () => {
    setLoading(true);
    try {
      await updateExistingItemsToOrderable();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-600" />
          <CardTitle className="text-orange-800">Data Sync Panel</CardTitle>
          <Badge variant="secondary">Debug Tool</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-orange-700">
          It looks like commissary items exist but aren't tagged as "orderable_item". 
          This panel helps diagnose and fix the data sync issue.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Button
            variant="outline"
            onClick={handleCheckLocalData}
            className="flex items-center gap-2"
          >
            <Database className="h-4 w-4" />
            Check Local Data
          </Button>
          
          <Button
            variant="outline"
            onClick={handleSyncLocalData}
            disabled={!localData || loading}
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            Sync to Database
          </Button>
          
          <Button
            variant="outline"
            onClick={handleUpdateExisting}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Fix Existing Items
          </Button>
        </div>
        
        {localData && (
          <div className="mt-4 p-3 bg-white rounded border">
            <h4 className="font-medium mb-2">Found Local Data:</h4>
            <pre className="text-xs overflow-auto max-h-40">
              {JSON.stringify(localData, null, 2)}
            </pre>
          </div>
        )}
        
        <div className="text-xs text-orange-600">
          <strong>Note:</strong> This panel helps identify if commissary data is stored locally 
          and needs to be synced to Supabase with the correct "orderable_item" type.
        </div>
      </CardContent>
    </Card>
  );
}
