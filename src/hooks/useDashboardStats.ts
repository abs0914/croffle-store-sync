
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/contexts/StoreContext";
import { fetchCashierReport } from "@/services/reports/cashierReport";
import { format, subDays } from "date-fns";

interface DashboardStats {
  dailySales: number;
  productsCount: number;
  customersCount: number;
  bestSeller: {
    name: string;
    quantity: number;
  };
  isLoading: boolean;
}

export function useDashboardStats() {
  const { currentStore } = useStore();
  const [stats, setStats] = useState<DashboardStats>({
    dailySales: 0,
    productsCount: 0, 
    customersCount: 0,
    bestSeller: {
      name: "",
      quantity: 0
    },
    isLoading: true
  });

  useEffect(() => {
    if (!currentStore) return;
    
    async function fetchDashboardStats() {
      try {
        // Get today's date and format it
        const today = format(new Date(), "yyyy-MM-dd");
        
        // Fetch today's sales
        const { data: salesData, error: salesError } = await supabase
          .from("transactions")
          .select("total")
          .eq("store_id", currentStore.id)
          .eq("status", "completed")
          .gte("created_at", `${today}T00:00:00`)
          .lte("created_at", `${today}T23:59:59`);
        
        if (salesError) throw salesError;
        
        // Calculate total sales for today
        const dailySales = salesData?.reduce((sum, tx) => sum + (tx.total || 0), 0) || 0;
        
        // Fetch active product count
        const { count: productsCount, error: productsError } = await supabase
          .from("products")
          .select("*", { count: 'exact', head: true })
          .eq("store_id", currentStore.id)
          .eq("is_active", true);
        
        if (productsError) throw productsError;
        
        // Fetch customers count
        const { count: customersCount, error: customersError } = await supabase
          .from("customers")
          .select("*", { count: 'exact', head: true })
          .eq("store_id", currentStore.id);
        
        if (customersError) throw customersError;
        
        // Fetch transactions from past week to find best seller
        const weekAgo = format(subDays(new Date(), 7), "yyyy-MM-dd");
        const { data: transactions, error: txError } = await supabase
          .from("transactions")
          .select("items")
          .eq("store_id", currentStore.id)
          .eq("status", "completed")
          .gte("created_at", `${weekAgo}T00:00:00`)
          .lte("created_at", `${today}T23:59:59`);
        
        if (txError) throw txError;
        
        // Process transactions to find best seller
        const productSales: Record<string, { name: string; quantity: number }> = {};
        
        transactions?.forEach(tx => {
          const items = typeof tx.items === 'string' ? JSON.parse(tx.items) : tx.items;
          
          items?.forEach((item: any) => {
            const name = item.name;
            const quantity = item.quantity || 0;
            
            if (!productSales[name]) {
              productSales[name] = {
                name,
                quantity: 0
              };
            }
            
            productSales[name].quantity += quantity;
          });
        });
        
        // Find best seller
        let bestSeller = { name: "No sales yet", quantity: 0 };
        
        if (Object.keys(productSales).length > 0) {
          bestSeller = Object.values(productSales).reduce(
            (best, current) => (current.quantity > best.quantity ? current : best),
            { name: "", quantity: 0 }
          );
        }
        
        setStats({
          dailySales,
          productsCount: productsCount || 0,
          customersCount: customersCount || 0,
          bestSeller,
          isLoading: false
        });
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        setStats(prev => ({ ...prev, isLoading: false }));
      }
    }
    
    fetchDashboardStats();
  }, [currentStore]);
  
  return stats;
}
