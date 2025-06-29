
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Database, RefreshCw, Upload } from 'lucide-react';
import { checkLocalStorageForCommissaryData, syncLocalDataToSupabase, updateExistingItemsToOrderable } from '@/utils/commissaryDataSync';

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
    <Card className="mb-6 border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-800">
          <Database className="h-5 w-5" />
          Data Sync Panel (Debug)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={handleCheckLocalData}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <AlertTriangle className="h-4 w-4" />
            Check Local Data
          </Button>
          
          <Button
            onClick={handleSyncLocalData}
            disabled={!localData || loading}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            {loading ? 'Syncing...' : 'Sync to Database'}
          </Button>
          
          <Button
            onClick={handleUpdateExisting}
            disabled={loading}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            {loading ? 'Updating...' : 'Update Existing Items'}
          </Button>
        </div>
        
        {localData && (
          <div className="mt-4">
            <Badge variant="secondary" className="mb-2">
              Local Data Found
            </Badge>
            <pre className="bg-white p-2 rounded text-xs overflow-auto max-h-32">
              {JSON.stringify(localData, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
