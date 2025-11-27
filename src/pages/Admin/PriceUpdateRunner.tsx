import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { updateSavemorePrices } from "@/scripts/updateSavermorePrices";
import { toast } from "sonner";

export default function PriceUpdateRunner() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const handleRunUpdate = async () => {
    setIsRunning(true);
    toast.info("Starting price updates...");
    
    try {
      const updateResults = await updateSavemorePrices();
      setResults(updateResults);
      
      const successCount = updateResults.filter(r => r.success).length;
      const failCount = updateResults.filter(r => !r.success).length;
      
      if (failCount === 0) {
        toast.success(`All ${successCount} prices updated successfully!`);
      } else {
        toast.warning(`${successCount} updated, ${failCount} failed`);
      }
    } catch (error) {
      toast.error(`Update failed: ${error}`);
      console.error(error);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">SM Savemore Tacloban Price Update</h1>
        <p className="text-muted-foreground mt-2">
          Click the button below to update product prices to the correct values
        </p>
      </div>

      <Card className="p-6">
        <Button 
          onClick={handleRunUpdate} 
          disabled={isRunning}
          size="lg"
          className="w-full"
        >
          {isRunning ? "Updating Prices..." : "Run Price Update"}
        </Button>
      </Card>

      {results.length > 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Update Results</h2>
          <div className="space-y-2">
            {results.map((result, index) => (
              <div 
                key={index} 
                className={`p-3 rounded-lg ${
                  result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{result.name}</span>
                  <span className="text-sm">₱{result.price.toFixed(2)}</span>
                </div>
                {!result.success && (
                  <p className="text-sm text-red-600 mt-1">{result.error}</p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
