import { useAuth } from "@/contexts/auth";
import { useStore } from "@/contexts/StoreContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";

export const InventoryDebugPanel = () => {
  const { user, isAuthenticated, session } = useAuth();
  const { currentStore, stores } = useStore();
  const [testResults, setTestResults] = useState<any>(null);
  
  const runDatabaseTest = async () => {
    if (!currentStore) {
      setTestResults({ error: "No current store selected" });
      return;
    }
    
    try {
      const results: any = {};
      
      // Test products query
      const { data: products, error: productsError } = await supabase
        .from("products")
        .select("id, name, store_id")
        .eq("store_id", currentStore.id);
        
      results.products = {
        count: products?.length || 0,
        error: productsError?.message,
        sample: products?.[0]
      };
      
      // Test categories query
      const { data: categories, error: categoriesError } = await supabase
        .from("categories")
        .select("id, name, store_id")
        .eq("store_id", currentStore.id);
        
      results.categories = {
        count: categories?.length || 0,
        error: categoriesError?.message,
        sample: categories?.[0]
      };
      
      // Test RLS policies
      const { data: storesTest, error: storesError } = await supabase
        .from("stores")
        .select("id, name");
        
      results.storeAccess = {
        accessible: storesTest?.length || 0,
        error: storesError?.message
      };
      
      setTestResults(results);
    } catch (error) {
      setTestResults({ error: error.message });
    }
  };

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <Card className="mb-6 border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="text-sm text-orange-800">Debug Panel (Development Only)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <h4 className="font-semibold mb-2">Authentication</h4>
            <div className="space-y-1">
              <div>Authenticated: <Badge variant={isAuthenticated ? "default" : "destructive"}>{isAuthenticated ? "Yes" : "No"}</Badge></div>
              <div>User ID: {user?.id || "None"}</div>
              <div>Email: {user?.email || "None"}</div>
              <div>Role: <Badge variant="outline">{user?.role || "None"}</Badge></div>
              <div>Store IDs: {user?.storeIds?.join(", ") || "None"}</div>
              <div>Session: <Badge variant={session ? "default" : "destructive"}>{session ? "Valid" : "None"}</Badge></div>
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold mb-2">Store Context</h4>
            <div className="space-y-1">
              <div>Current Store: {currentStore?.name || "None"}</div>
              <div>Store ID: {currentStore?.id || "None"}</div>
              <div>Available Stores: {stores?.length || 0}</div>
              <div>Store Names: {stores?.map(s => s.name).join(", ") || "None"}</div>
            </div>
          </div>
        </div>
        
        <div>
          <Button onClick={runDatabaseTest} size="sm" variant="outline">
            Test Database Access
          </Button>
        </div>
        
        {testResults && (
          <div className="bg-white p-3 rounded border text-xs">
            <h4 className="font-semibold mb-2">Database Test Results</h4>
            <pre className="whitespace-pre-wrap">{JSON.stringify(testResults, null, 2)}</pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
};