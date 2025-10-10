
export interface ProductSalesData {
  productId: string;
  productName: string;
  categoryName: string;
  totalQuantity: number;
  totalRevenue: number;
  transactionCount: number;
  averagePrice: number;
  unitPrice: number;
}

export interface ProductSalesReport {
  products: ProductSalesData[];
  totalProducts: number;
  totalUnits: number;
  totalRevenue: number;
  averageRevenuePerProduct: number;
  categorySales: Array<{
    category: string;
    totalSales: number;
    totalQuantity: number;
  }>;
}
