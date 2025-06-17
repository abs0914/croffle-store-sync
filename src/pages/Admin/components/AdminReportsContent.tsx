
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Store } from '@/types';

interface AdminReportsContentProps {
  reportData: any;
  reportType: 'sales' | 'inventory' | 'customers' | 'performance';
  isLoading: boolean;
  stores: Store[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export const AdminReportsContent: React.FC<AdminReportsContentProps> = ({
  reportData,
  reportType,
  isLoading,
  stores
}) => {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner className="h-8 w-8 text-blue-600" />
        <span className="ml-2 text-gray-600">Loading report data...</span>
      </div>
    );
  }

  if (!reportData) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-gray-500">No data available for the selected criteria.</p>
        </CardContent>
      </Card>
    );
  }

  const renderSalesReport = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Revenue by Store</CardTitle>
          <CardDescription>Revenue breakdown across all stores</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={reportData.storeBreakdown}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="storeName" />
              <YAxis />
              <Tooltip formatter={(value) => [`₱${Number(value).toFixed(2)}`, 'Revenue']} />
              <Bar dataKey="revenue" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daily Revenue Trends</CardTitle>
          <CardDescription>Revenue trends over the selected period</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={reportData.dailyTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(value) => [`₱${Number(value).toFixed(2)}`, 'Revenue']} />
              <Line type="monotone" dataKey="revenue" stroke="#8884d8" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Top Products</CardTitle>
          <CardDescription>Best performing products by revenue</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {reportData.topProducts.slice(0, 5).map((product: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <h4 className="font-medium">{product.productName}</h4>
                  <p className="text-sm text-gray-600">Qty Sold: {product.quantitySold}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">₱{product.revenue.toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderInventoryReport = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Inventory Value by Store</CardTitle>
          <CardDescription>Total inventory value across stores</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={reportData.storeBreakdown}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="storeName" />
              <YAxis />
              <Tooltip formatter={(value) => [`₱${Number(value).toFixed(2)}`, 'Value']} />
              <Bar dataKey="inventoryValue" fill="#00C49F" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Stock Status Overview</CardTitle>
          <CardDescription>Stock status across all stores</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={[
                  { name: 'Normal Stock', value: reportData.storeBreakdown.reduce((sum: number, store: any) => sum + (store.totalItems - store.lowStockItems - store.outOfStockItems), 0) },
                  { name: 'Low Stock', value: reportData.storeBreakdown.reduce((sum: number, store: any) => sum + store.lowStockItems, 0) },
                  { name: 'Out of Stock', value: reportData.storeBreakdown.reduce((sum: number, store: any) => sum + store.outOfStockItems, 0) }
                ]}
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {COLORS.map((color, index) => (
                  <Cell key={`cell-${index}`} fill={color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Low Stock Items</CardTitle>
          <CardDescription>Items that need restocking</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {reportData.lowStockItems.slice(0, 10).map((item: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                <div>
                  <h4 className="font-medium">{item.productName}</h4>
                  <p className="text-sm text-gray-600">{item.storeName}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-red-600">{item.currentStock} / {item.minThreshold}</p>
                  <p className="text-xs text-gray-500">Current / Min</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderCustomerReport = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Customers by Store</CardTitle>
          <CardDescription>Customer distribution across stores</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={reportData.storeBreakdown}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="storeName" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="totalCustomers" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Customer Growth</CardTitle>
          <CardDescription>New customer acquisition over time</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={reportData.customerGrowth}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="newCustomers" stroke="#8884d8" name="New Customers" />
              <Line type="monotone" dataKey="totalCustomers" stroke="#82ca9d" name="Total Customers" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Store Performance</CardTitle>
          <CardDescription>Customer metrics by store</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {reportData.storeBreakdown.map((store: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h4 className="font-medium">{store.storeName}</h4>
                  <div className="flex gap-4 text-sm text-gray-600 mt-1">
                    <span>Total: {store.totalCustomers}</span>
                    <span>Active: {store.activeCustomers}</span>
                    <span>New: {store.newCustomers}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">₱{store.averageLifetimeValue.toFixed(2)}</p>
                  <p className="text-xs text-gray-500">Avg Lifetime Value</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderPerformanceReport = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Store Performance Comparison</CardTitle>
          <CardDescription>Overall performance metrics by store</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={reportData.storePerformance}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="storeName" />
              <YAxis />
              <Tooltip formatter={(value) => [Number(value).toFixed(2), 'Efficiency']} />
              <Bar dataKey="efficiency" fill="#FF8042" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Performance Trends</CardTitle>
          <CardDescription>Efficiency trends over time</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={reportData.trends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="efficiency" stroke="#FF8042" name="Efficiency" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Detailed Store Metrics</CardTitle>
          <CardDescription>Comprehensive performance breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {reportData.storePerformance.map((store: any, index: number) => (
              <div key={index} className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2">{store.storeName}</h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Revenue</p>
                    <p className="font-semibold">₱{store.revenue.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Transactions</p>
                    <p className="font-semibold">{store.transactions}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Customers</p>
                    <p className="font-semibold">{store.customers}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Products</p>
                    <p className="font-semibold">{store.products}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Efficiency</p>
                    <p className="font-semibold">{store.efficiency.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  switch (reportType) {
    case 'sales':
      return renderSalesReport();
    case 'inventory':
      return renderInventoryReport();
    case 'customers':
      return renderCustomerReport();
    case 'performance':
      return renderPerformanceReport();
    default:
      return null;
  }
};
