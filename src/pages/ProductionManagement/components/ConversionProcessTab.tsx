import { useState, useEffect } from "react";
import { RefreshCw, Info } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CommissaryInventoryItem } from "@/types/commissary";
import { fetchConversionHistory, fetchAvailableRawMaterials } from "@/services/conversion";
import { ConversionForm, ConversionHistory } from "./conversion";
import { toast } from "sonner";
export function ConversionProcessTab() {
  const [rawMaterials, setRawMaterials] = useState<CommissaryInventoryItem[]>([]);
  const [conversions, setConversions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    loadData();
  }, []);
  const loadData = async () => {
    try {
      console.log('Loading conversion data...');
      setLoading(true);
      setError(null);
      const [materialsData, conversionsData] = await Promise.all([fetchAvailableRawMaterials(), fetchConversionHistory()]);
      console.log('Materials loaded:', materialsData.length);
      console.log('Conversions loaded:', conversionsData.length);
      setRawMaterials(materialsData);
      setConversions(conversionsData);
    } catch (error) {
      console.error('Error loading conversion data:', error);
      setError('Failed to load conversion data');
      toast.error('Failed to load conversion data');
    } finally {
      setLoading(false);
    }
  };
  if (loading) {
    return <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>;
  }
  if (error) {
    return <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <p className="text-red-600">{error}</p>
        <button onClick={loadData} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
          Try Again
        </button>
      </div>;
  }
  return <div className="space-y-6">
      {/* Info Card */}
      

      <ConversionForm rawMaterials={rawMaterials} onConversionComplete={loadData} />
      <ConversionHistory conversions={conversions} />
    </div>;
}