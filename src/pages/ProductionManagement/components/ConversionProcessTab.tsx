
import { useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { CommissaryInventoryItem } from "@/types/commissary";
import { fetchConversionHistory, fetchAvailableRawMaterials } from "@/services/conversion";
import { ConversionForm, ConversionHistory } from "./conversion";

export function ConversionProcessTab() {
  const [rawMaterials, setRawMaterials] = useState<CommissaryInventoryItem[]>([]);
  const [conversions, setConversions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [materialsData, conversionsData] = await Promise.all([
      fetchAvailableRawMaterials(),
      fetchConversionHistory()
    ]);
    setRawMaterials(materialsData);
    setConversions(conversionsData);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ConversionForm 
        rawMaterials={rawMaterials}
        onConversionComplete={loadData}
      />
      <ConversionHistory conversions={conversions} />
    </div>
  );
}
