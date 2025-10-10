
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

    // Collect all unique product IDs
    const productIds = new Set<string>();
    transactions.forEach(tx => {
      const items = typeof tx.items === 'string' ? JSON.parse(tx.items) : tx.items;
      items.forEach((item: any) => {
        if (item.productId) {
          productIds.add(item.productId);
        }
      });
    });

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

    // Create product lookup map
    const productLookup = new Map<string, { name: string; categoryName: string }>();
    products?.forEach(product => {
      productLookup.set(product.id, {
        name: product.name,
        categoryName: product.categories?.name || 'Uncategorized'
      });
    });

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
        const productDetails = productLookup.get(productId);
        const productName = productDetails?.name || item.name;
        const categoryName = productDetails?.categoryName || 'Uncategorized';
        const quantity = item.quantity;
        const totalPrice = item.totalPrice;
        const unitPrice = item.unitPrice || item.price;

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
