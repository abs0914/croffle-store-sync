
import { supabase } from "@/integrations/supabase/client";
import { ProductSalesReport } from "@/types/reports/productSales";
import { toast } from "sonner";
import { fetchTransactionsWithFallback } from "./utils/transactionQueryUtils";

export async function fetchProductSalesReport(
  storeId: string,
  from: string,
  to: string
): Promise<ProductSalesReport | null> {
  try {
    console.log('🔍 Fetching product sales report:', { storeId, from, to });

    // Use unified transaction query
    const queryResult = await fetchTransactionsWithFallback({
      storeId,
      from,
      to,
      status: "completed",
      orderBy: "created_at",
      ascending: true
    });

    const { data: transactions, error } = queryResult;

    if (error) {
      console.error("❌ Product sales report query error:", error);
      throw error;
    }

    if (!transactions || transactions.length === 0) {
      console.info("ℹ️ No product sales data found for the selected period");
      return null;
    }

    console.log(`📦 Processing ${transactions.length} transactions for product sales`);

    // Helper function to extract base product ID from combo format
    const extractBaseProductId = (productId: string): string | null => {
      if (productId.startsWith('combo-')) {
        // Format: "combo-uuid-uuid" where first uuid is base product
        const parts = productId.split('-');
        if (parts.length >= 6) {
          // Reconstruct the first UUID (parts 1-5)
          return parts.slice(1, 6).join('-');
        }
      }
      return null;
    };

    // Collect all unique product IDs (including base IDs from combos)
    const productIds = new Set<string>();
    const comboMapping = new Map<string, string>(); // Maps combo ID to base ID
    
    transactions.forEach(tx => {
      const items = typeof tx.items === 'string' ? JSON.parse(tx.items) : tx.items;
      items.forEach((item: any) => {
        if (item.productId) {
          productIds.add(item.productId);
          
          // If it's a combo, also add the base product ID
          const baseId = extractBaseProductId(item.productId);
          if (baseId) {
            productIds.add(baseId);
            comboMapping.set(item.productId, baseId);
            console.log(`🔗 Found combo product: ${item.productId} -> base: ${baseId}`);
          }
        }
      });
    });

    console.log(`🔍 Found ${productIds.size} unique product IDs (including ${comboMapping.size} combos)`);

    // Fetch product details with categories
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select(`
        id,
        name,
        category_id,
        categories (
          name
        )
      `)
      .in('id', Array.from(productIds));

    if (productsError) {
      console.error("❌ Error fetching product details:", productsError);
    }

    // Create product lookup map (includes both direct products and base products for combos)
    const productLookup = new Map<string, { name: string; categoryName: string }>();
    products?.forEach(product => {
      productLookup.set(product.id, {
        name: product.name,
        categoryName: product.categories?.name || 'Uncategorized'
      });
    });

    console.log(`📋 Loaded ${productLookup.size} products with categories`);

    // Aggregate product sales data
    const productMap = new Map<string, {
      productId: string;
      productName: string;
      categoryName: string;
      totalQuantity: number;
      totalRevenue: number;
      transactionCount: number;
      unitPrice: number;
    }>();

    const categoryMap = new Map<string, {
      totalSales: number;
      totalQuantity: number;
    }>();

    transactions.forEach(tx => {
      const items = typeof tx.items === 'string' ? JSON.parse(tx.items) : tx.items;
      
      items.forEach((item: any) => {
        const productId = item.productId;
        
        // Try to get product details - first try direct ID, then base ID if combo
        let productDetails = productLookup.get(productId);
        if (!productDetails && comboMapping.has(productId)) {
          const baseId = comboMapping.get(productId)!;
          productDetails = productLookup.get(baseId);
          console.log(`🔄 Using base product category for combo: ${productId} -> ${baseId}`);
        }
        
        const productName = productDetails?.name || item.name;
        const categoryName = productDetails?.categoryName || 'Uncategorized';
        const quantity = item.quantity;
        const totalPrice = item.totalPrice;
        const unitPrice = item.unitPrice || item.price;

        // Log uncategorized products for debugging
        if (categoryName === 'Uncategorized') {
          console.warn(`⚠️ Uncategorized product: ${productName} (ID: ${productId})`);
        }

        // Aggregate by product
        if (productMap.has(productId)) {
          const existing = productMap.get(productId)!;
          existing.totalQuantity += quantity;
          existing.totalRevenue += totalPrice;
          existing.transactionCount += 1;
        } else {
          productMap.set(productId, {
            productId,
            productName,
            categoryName,
            totalQuantity: quantity,
            totalRevenue: totalPrice,
            transactionCount: 1,
            unitPrice
          });
        }

        // Aggregate by category
        if (categoryMap.has(categoryName)) {
          const existing = categoryMap.get(categoryName)!;
          existing.totalSales += totalPrice;
          existing.totalQuantity += quantity;
        } else {
          categoryMap.set(categoryName, {
            totalSales: totalPrice,
            totalQuantity: quantity
          });
        }
      });
    });

    // Convert maps to arrays and calculate metrics
    const productSalesData = Array.from(productMap.values())
      .map(product => ({
        ...product,
        averagePrice: product.totalRevenue / product.totalQuantity
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue);

    const categorySales = Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        category,
        totalSales: data.totalSales,
        totalQuantity: data.totalQuantity
      }))
      .sort((a, b) => b.totalSales - a.totalSales);

    const totalProducts = productSalesData.length;
    const totalUnits = productSalesData.reduce((sum, p) => sum + p.totalQuantity, 0);
    const totalRevenue = productSalesData.reduce((sum, p) => sum + p.totalRevenue, 0);
    const averageRevenuePerProduct = totalProducts > 0 ? totalRevenue / totalProducts : 0;

    console.log(`📊 Product sales summary: ${totalProducts} products, ${totalUnits} units, ₱${totalRevenue.toFixed(2)}`);

    return {
      products: productSalesData,
      totalProducts,
      totalUnits,
      totalRevenue,
      averageRevenuePerProduct,
      categorySales
    };
  } catch (error) {
    console.error("❌ Error fetching product sales report:", error);
    toast.error("Failed to load product sales report");
    return null;
  }
}
