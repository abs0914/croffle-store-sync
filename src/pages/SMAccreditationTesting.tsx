import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { SMAccreditationTestRunner } from '@/components/testing/SMAccreditationTestRunner';
import { SMSchedulerTest } from '@/components/testing/SMSchedulerTest';
import { ManualCSVDownloader } from '@/components/testing/ManualCSVDownloader';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { FileCheck, Store, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface Store {
  id: string;
  name: string;
}

export default function SMAccreditationTesting() {
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadStores();
  }, []);

  const loadStores = async () => {
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (error) {
        throw error;
      }

      setStores(data || []);
      
      if (data && data.length > 0) {
        setSelectedStoreId(data[0].id);
      }
    } catch (error) {
      console.error('Error loading stores:', error);
      toast({
        title: "Error",
        description: "Failed to load stores",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-sm text-muted-foreground">Loading stores...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-2 bg-primary/10 rounded-lg">
          <FileCheck className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">SM Accreditation Testing</h1>
          <p className="text-muted-foreground">
            Comprehensive testing suite for SM Accreditation CSV export compliance
          </p>
        </div>
      </div>

      {/* Test Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Testing Requirements Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-lg mb-3">Updated SM Test Requirements</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="default">NEW</Badge>
                  <span className="text-sm font-medium">1 business date = 1 scenario</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="default">NEW</Badge>
                  <span className="text-sm font-medium">All scenarios in 1 CSV file</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="default">NEW</Badge>
                  <span className="text-sm font-medium">File name: current month (MM_YYYY_transactions.csv)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Scenario 1</Badge>
                  <span className="text-sm">Regular transactions (5 days ago)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Scenario 2</Badge>
                  <span className="text-sm">Senior citizen & PWD discounts (4 days ago)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Scenario 3</Badge>
                  <span className="text-sm">Multiple promotional campaigns (3 days ago)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Scenario 4</Badge>
                  <span className="text-sm">Returns, voids, and refunds (2 days ago)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Scenario 5</Badge>
                  <span className="text-sm">Complex mixed transactions (1 day ago)</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-3">Validation Checks</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Correct file naming (MM_YYYY_transactions.csv)</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm">CSV header structure compliance</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm">One business date per scenario</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm">All scenarios in single CSV file</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Transaction totals accuracy</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Discount calculations validation</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Promo details format ([ref]=[name]::)</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm">VAT calculations (12% on VATable items)</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Senior/PWD exemption handling</span>
                </div>
              </div>
            </div>
          </div>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Updated Guidelines:</strong> Following the new SM requirements, each test scenario 
              uses exactly one business date, and all scenarios are exported to a single CSV file 
              named with the current month format (e.g., 08_2025_transactions.csv). This ensures 
              compliance with the latest SM accreditation standards.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Store Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            Select Test Store
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4 items-end">
              <div className="space-y-2">
                <label className="text-sm font-medium">Store</label>
                <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a store" />
                  </SelectTrigger>
                  <SelectContent>
                    {stores.map((store) => (
                      <SelectItem key={store.id} value={store.id}>
                        {store.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Badge variant={selectedStoreId ? "default" : "secondary"} className="mb-2">
                  {selectedStoreId ? "Store Selected" : "No Store Selected"}
                </Badge>
              </div>
            </div>

            {stores.length === 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  No active stores found. Please ensure you have at least one active store configured.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Manual CSV Download & Email */}
      {selectedStoreId && (
        <ManualCSVDownloader 
          storeId={selectedStoreId}
          storeName={stores.find(s => s.id === selectedStoreId)?.name}
        />
      )}

      {/* Test Runner */}
      {selectedStoreId && (
        <>
          <SMAccreditationTestRunner 
            storeId={selectedStoreId}
            storeName={stores.find(s => s.id === selectedStoreId)?.name}
          />
          
          <SMSchedulerTest 
            storeId={selectedStoreId}
            storeName={stores.find(s => s.id === selectedStoreId)?.name}
          />
        </>
      )}

      {/* SM Requirements Reference */}
      <Card>
        <CardHeader>
          <CardTitle>SM Accreditation Requirements Reference</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-2">Transactions File Format</h4>
              <div className="bg-muted p-3 rounded-lg font-mono text-xs">
                <div>receipt_number,business_date,transaction_time,</div>
                <div>gross_amount,discount_amount,net_amount,</div>
                <div>vat_amount,payment_method,discount_type,</div>
                <div>discount_id,promo_details,senior_discount,pwd_discount</div>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">Transaction Details File Format</h4>
              <div className="bg-muted p-3 rounded-lg font-mono text-xs">
                <div>receipt_number,item_sequence,item_description,</div>
                <div>quantity,unit_price,line_total,</div>
                <div>item_discount,vat_exempt_flag</div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Updated Key Requirements</h4>
            <ul className="text-sm space-y-1 list-disc list-inside">
              <li><strong>NEW:</strong> Each scenario uses exactly 1 business date (no mixed dates)</li>
              <li><strong>NEW:</strong> All test scenarios combined into 1 CSV file only</li>
              <li><strong>NEW:</strong> File naming: MM_YYYY_transactions.csv (e.g., 08_2025_transactions.csv)</li>
              <li>Follow correct CSV format with proper columns & headers</li>
              <li>BIR compliant VAT and discount recording (12% VAT on VATable items)</li>
              <li>Senior citizen/PWD discount tracking (20% on VATable amount)</li>
              <li>Promo reference recording in format: [ref]=[name]::multiple_promos</li>
              <li>Proper handling of returns, voids, and refunds (negative quantities)</li>
              <li>Directory structure: C:\SIA\ (Windows) or /opt/sia/ (Linux)</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}