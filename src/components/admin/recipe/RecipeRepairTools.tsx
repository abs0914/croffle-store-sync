import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Wrench, AlertTriangle, CheckCircle } from 'lucide-react';
import { 
  repairMissingProductCatalogEntries, 
  checkMissingProductCatalogEntries,
  getMissingProductCatalogEntries 
} from '@/services/recipeManagement/recipeRepairService';

export const RecipeRepairTools: React.FC = () => {
  const [isChecking, setIsChecking] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);
  const [missingCount, setMissingCount] = useState<number | null>(null);
  const [missingEntries, setMissingEntries] = useState<any[]>([]);
  const [repairResult, setRepairResult] = useState<{ repaired_count: number; errors: string[] } | null>(null);

  const handleCheckMissing = async () => {
    setIsChecking(true);
    try {
      const [count, entries] = await Promise.all([
        checkMissingProductCatalogEntries(),
        getMissingProductCatalogEntries()
      ]);
      
      setMissingCount(count);
      setMissingEntries(entries);
    } catch (error) {
      console.error('Error checking missing entries:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const handleRepair = async () => {
    setIsRepairing(true);
    try {
      const result = await repairMissingProductCatalogEntries();
      setRepairResult(result);
      
      // Refresh the missing count after repair
      if (result.repaired_count > 0) {
        const newCount = await checkMissingProductCatalogEntries();
        setMissingCount(newCount);
        setMissingEntries([]); // Clear the list since it's now outdated
      }
    } catch (error) {
      console.error('Error repairing entries:', error);
    } finally {
      setIsRepairing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="h-5 w-5" />
          Recipe Repair Tools
        </CardTitle>
        <CardDescription>
          Repair missing product catalog entries for deployed recipes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Check for missing entries */}
        <div className="flex items-center gap-4">
          <Button 
            onClick={handleCheckMissing} 
            disabled={isChecking}
            variant="outline"
          >
            {isChecking ? 'Checking...' : 'Check Missing Entries'}
          </Button>
          
          {missingCount !== null && (
            <Badge variant={missingCount > 0 ? "destructive" : "default"}>
              {missingCount} missing entries
            </Badge>
          )}
        </div>

        {/* Missing entries list */}
        {missingEntries.length > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">
                  Found {missingEntries.length} recipes without product catalog entries:
                </p>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {missingEntries.slice(0, 10).map((entry, index) => (
                    <div key={index} className="text-sm">
                      • {entry.name} at {entry.stores?.name} 
                      <span className="text-muted-foreground ml-2">
                        (₱{entry.suggested_price || entry.total_cost || 0})
                      </span>
                    </div>
                  ))}
                  {missingEntries.length > 10 && (
                    <div className="text-sm text-muted-foreground">
                      ... and {missingEntries.length - 10} more
                    </div>
                  )}
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Repair button */}
        {missingCount !== null && missingCount > 0 && (
          <div className="space-y-2">
            <Button 
              onClick={handleRepair} 
              disabled={isRepairing}
              className="w-full"
            >
              {isRepairing ? 'Repairing...' : `Repair ${missingCount} Missing Entries`}
            </Button>
            <p className="text-sm text-muted-foreground">
              This will create product catalog entries for all deployed recipes that are missing them.
            </p>
          </div>
        )}

        {/* Repair results */}
        {repairResult && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">
                  Repair completed: {repairResult.repaired_count} entries created
                </p>
                {repairResult.errors.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-red-600">Errors:</p>
                    <ul className="text-sm text-red-600 list-disc list-inside">
                      {repairResult.errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {missingCount === 0 && missingCount !== null && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              All deployed recipes have product catalog entries. No repairs needed!
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};