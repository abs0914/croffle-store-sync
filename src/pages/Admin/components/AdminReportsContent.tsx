
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Store } from '@/types';
import { AdminExpenseReportContent } from './AdminExpenseReportContent';

interface AdminReportsContentProps {
  reportData: any;
  reportType: 'sales' | 'profit-loss' | 'expenses';
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
          <CardTitle>Company vs Franchise Performance</CardTitle>
          <CardDescription>Revenue comparison by ownership type</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={reportData.ownershipBreakdown}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="ownershipType" />
              <YAxis />
              <Tooltip formatter={(value) => [`₱${Number(value).toFixed(2)}`, 'Revenue']} />
              <Bar dataKey="revenue" fill="#00C49F" />
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

  const renderProfitLossReport = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Revenue vs Cost Breakdown</CardTitle>
          <CardDescription>Revenue, cost, and profit by store</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={reportData.storeBreakdown}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="storeName" />
              <YAxis />
              <Tooltip formatter={(value) => [`₱${Number(value).toFixed(2)}`]} />
              <Bar dataKey="revenue" fill="#00C49F" name="Revenue" />
              <Bar dataKey="cost" fill="#FF8042" name="Cost" />
              <Bar dataKey="profit" fill="#8884d8" name="Profit" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Company vs Franchise Profit</CardTitle>
          <CardDescription>Profit comparison by ownership type</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={reportData.ownershipBreakdown}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="ownershipType" />
              <YAxis />
              <Tooltip formatter={(value) => [`₱${Number(value).toFixed(2)}`, 'Profit']} />
              <Bar dataKey="profit" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daily Profit Trends</CardTitle>
          <CardDescription>Daily profit and loss over the selected period</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={reportData.profitByDate}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(value) => [`₱${Number(value).toFixed(2)}`]} />
              <Line type="monotone" dataKey="revenue" stroke="#00C49F" name="Revenue" />
              <Line type="monotone" dataKey="cost" stroke="#FF8042" name="Cost" />
              <Line type="monotone" dataKey="profit" stroke="#8884d8" name="Profit" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Product Profitability</CardTitle>
          <CardDescription>Most profitable products by margin</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {reportData.productProfitability.slice(0, 5).map((product: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h4 className="font-medium">{product.name}</h4>
                  <div className="flex gap-4 text-sm text-gray-600 mt-1">
                    <span>Revenue: ₱{product.revenue.toFixed(2)}</span>
                    <span>Cost: ₱{product.cost.toFixed(2)}</span>
                    <span>Margin: {product.margin.toFixed(1)}%</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">₱{product.profit.toFixed(2)}</p>
                  <p className="text-xs text-gray-500">Profit</p>
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
    case 'profit-loss':
      return renderProfitLossReport();
    case 'expenses':
      return <AdminExpenseReportContent reportData={reportData} />;
    default:
      return null;
  }
};
