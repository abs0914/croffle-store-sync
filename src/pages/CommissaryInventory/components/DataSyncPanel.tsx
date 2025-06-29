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
  return;
}