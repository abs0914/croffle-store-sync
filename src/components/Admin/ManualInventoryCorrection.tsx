import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Wrench, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2,
  Trash2,
  Plus
} from 'lucide-react';
import { useManualInventoryCorrection } from '@/hooks/useManualInventoryCorrection';

export const ManualInventoryCorrection: React.FC = () => {
  const [transactionId, setTransactionId] = useState('');
  const [transactionIds, setTransactionIds] = useState<string[]>([]);
  const [newTransactionId, setNewTransactionId] = useState('');
  const { 
    loading, 
    results, 
    correctSingleTransaction, 
    correctMultipleTransactions, 
    clearResults 
  } = useManualInventoryCorrection();

  const handleSingleCorrection = async () => {
    if (!transactionId.trim()) {
      return;
    }
    await correctSingleTransaction(transactionId.trim());
    setTransactionId('');
  };

  const handleBatchCorrection = async () => {
    if (transactionIds.length === 0) {
      return;
    }
    await correctMultipleTransactions(transactionIds);
    setTransactionIds([]);
  };

  const addTransactionId = () => {
    if (newTransactionId.trim() && !transactionIds.includes(newTransactionId.trim())) {
      setTransactionIds(prev => [...prev, newTransactionId.trim()]);
      setNewTransactionId('');
    }
  };

  const removeTransactionId = (id: string) => {
    setTransactionIds(prev => prev.filter(t => t !== id));
  };

  const getResultBadge = (success: boolean) => {
    return success ? (
      <Badge className="bg-green-100 text-green-800">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        Success
      </Badge>
    ) : (
      <Badge className="bg-red-100 text-red-800">
        <AlertTriangle className="h-3 w-3 mr-1" />
        Failed
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Manual Inventory Correction</h2>
        <p className="text-gray-600">
          Manually apply missing inventory deductions for transactions that failed to deduct properly
        </p>
      </div>

      {/* Single Transaction Correction */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Wrench className="h-5 w-5 mr-2" />
            Single Transaction Correction
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Example:</strong> For the Choco Marshmallow transaction, use: <code>20250820-6819-141615</code>
            </AlertDescription>
          </Alert>
          
          <div className="flex space-x-2">
            <Input
              placeholder="Transaction ID (e.g., 20250820-6819-141615)"
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              disabled={loading}
            />
            <Button 
              onClick={handleSingleCorrection}
              disabled={loading || !transactionId.trim()}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wrench className="h-4 w-4" />}
              Correct
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Batch Transaction Correction */}
      <Card>
        <CardHeader>
          <CardTitle>Batch Transaction Correction</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <Input
              placeholder="Enter transaction ID"
              value={newTransactionId}
              onChange={(e) => setNewTransactionId(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addTransactionId()}
              disabled={loading}
            />
            <Button onClick={addTransactionId} disabled={loading}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {transactionIds.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Transactions to correct:</p>
              <div className="flex flex-wrap gap-2">
                {transactionIds.map((id) => (
                  <Badge key={id} variant="outline" className="flex items-center">
                    {id}
                    <button
                      onClick={() => removeTransactionId(id)}
                      className="ml-2 text-red-500 hover:text-red-700"
                      disabled={loading}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <Button 
                onClick={handleBatchCorrection}
                disabled={loading}
                className="mt-2"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wrench className="h-4 w-4" />}
                Correct All ({transactionIds.length})
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {results.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Correction Results</CardTitle>
            <Button variant="outline" onClick={clearResults}>
              Clear Results
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {results.map((result, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <code className="font-mono text-sm">{result.transaction_id}</code>
                    {getResultBadge(result.success)}
                  </div>
                  
                  <div className="text-sm text-gray-600">
                    <p>Corrections made: <strong>{result.corrections_made}</strong></p>
                    {result.errors.length > 0 && (
                      <div className="mt-2">
                        <p className="text-red-600 font-medium">Errors:</p>
                        <ul className="list-disc list-inside mt-1">
                          {result.errors.map((error, i) => (
                            <li key={i} className="text-red-600">{error}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};