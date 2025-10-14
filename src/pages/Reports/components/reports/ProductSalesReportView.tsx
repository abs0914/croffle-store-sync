import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ProductSalesReport } from "@/types/reports/productSales";
import { formatCurrency } from "@/utils/format";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Button } from "@/components/ui/button";
import { Download, ArrowUpDown } from "lucide-react";
import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import * as XLSX from 'xlsx';
import { formatInTimeZone } from "date-fns-tz";

interface ProductSalesReportViewProps {
  data: ProductSalesReport | null;
  dateRange: {
    from: Date | undefined;
    to: Date | undefined;
  };
  isAllStores?: boolean;
  storeId: string;
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A28FD0', '#F08080'];

export function ProductSalesReportView({ data, dateRange, isAllStores, storeId }: ProductSalesReportViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortColumn, setSortColumn] = useState<'productName' | 'totalQuantity' | 'totalRevenue' | 'transactionCount'>('totalRevenue');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  if (!data) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="text-center py-10">
            <p>No product sales data available for the selected period</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const PHILIPPINES_TZ = 'Asia/Manila';
  const dateRangeText = dateRange.from && dateRange.to
    ? `${formatInTimeZone(dateRange.from, PHILIPPINES_TZ, 'MMM dd, yyyy')} - ${formatInTimeZone(dateRange.to, PHILIPPINES_TZ, 'MMM dd, yyyy')}`
    : 'Custom Range';

  // Filter and sort products
  const filteredAndSortedProducts = useMemo(() => {
    let filtered = data.products.filter(product =>
      product.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.categoryName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    filtered.sort((a, b) => {
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];
      const comparison = aValue > bValue ? 1 : -1;
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [data.products, searchQuery, sortColumn, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedProducts.length / itemsPerPage);
  const paginatedProducts = filteredAndSortedProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSort = (column: typeof sortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const handleExport = () => {
    const exportData = filteredAndSortedProducts.map(product => ({
      'Product Name': product.productName,
      'Category': product.categoryName,
      'Units Sold': product.totalQuantity,
      'Revenue': product.totalRevenue,
      'Avg Price': product.averagePrice,
      'Transactions': product.transactionCount,
      'Unit Price': product.unitPrice
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Product Sales');
    XLSX.writeFile(wb, `product-sales-${dateRange.from?.toISOString().split('T')[0]}-to-${dateRange.to?.toISOString().split('T')[0]}.xlsx`);
  };

  // Top 10 products for chart
  const top10Products = data.products.slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">
            Product Sales Overview: {isAllStores ? "All Stores - " : ""}{dateRangeText}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-croffle-light/20 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">Total Products Sold</p>
              <h3 className="text-2xl font-bold text-croffle-primary">{data.totalProducts}</h3>
            </div>
            <div className="bg-croffle-light/20 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">Total Units</p>
              <h3 className="text-2xl font-bold text-croffle-primary">{data.totalUnits}</h3>
            </div>
            <div className="bg-croffle-light/20 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <h3 className="text-2xl font-bold text-croffle-primary">{formatCurrency(data.totalRevenue)}</h3>
            </div>
            <div className="bg-croffle-light/20 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">Avg Revenue/Product</p>
              <h3 className="text-2xl font-bold text-croffle-primary">
                {formatCurrency(data.averageRevenuePerProduct)}
              </h3>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sales by Category Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Sales by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.categorySales}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip formatter={(value) => `₱${Number(value).toFixed(2)}`} />
                <Legend />
                <Bar dataKey="totalSales" name="Total Sales" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Top 10 Products Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Top 10 Best-Selling Products</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={top10Products}
                margin={{ top: 5, right: 30, left: 20, bottom: 80 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="productName" 
                  angle={-45} 
                  textAnchor="end" 
                  height={100}
                />
                <YAxis />
                <Tooltip formatter={(value) => `₱${Number(value).toFixed(2)}`} />
                <Legend />
                <Bar dataKey="totalRevenue" name="Revenue" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Product Sales Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="text-lg">Product Sales Details</CardTitle>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Input
                placeholder="Search products or categories..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full sm:w-[300px]"
              />
              <Button onClick={handleExport} variant="outline" className="w-full sm:w-auto">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('productName')}
                      className="font-semibold"
                    >
                      Product Name
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('totalQuantity')}
                      className="font-semibold"
                    >
                      Units Sold
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('totalRevenue')}
                      className="font-semibold"
                    >
                      Revenue
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>Avg Price</TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('transactionCount')}
                      className="font-semibold"
                    >
                      Transactions
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedProducts.map((product) => (
                  <TableRow key={product.productId}>
                    <TableCell className="font-medium">{product.productName}</TableCell>
                    <TableCell>{product.categoryName}</TableCell>
                    <TableCell>{product.totalQuantity}</TableCell>
                    <TableCell>{formatCurrency(product.totalRevenue)}</TableCell>
                    <TableCell>{formatCurrency(product.averagePrice)}</TableCell>
                    <TableCell>{product.transactionCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredAndSortedProducts.length)} of {filteredAndSortedProducts.length} products
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
