import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

interface ExpenseReportContentProps {
  reportData: any;
}

export const AdminExpenseReportContent: React.FC<ExpenseReportContentProps> = ({ reportData }) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <Card>
      <CardHeader>
        <CardTitle>Expenses by Category</CardTitle>
        <CardDescription>Expense breakdown by category</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={reportData.categoryBreakdown || []}
              cx="50%"
              cy="50%"
              outerRadius={80}
              fill="#8884d8"
              dataKey="amount"
              label={({ name, percentage }) => `${name} ${percentage}%`}
            >
              {(reportData.categoryBreakdown || []).map((_: any, index: number) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => [`₱${Number(value).toFixed(2)}`, 'Amount']} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>Company vs Franchise Expenses</CardTitle>
        <CardDescription>Expense comparison by ownership type</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={reportData.ownershipBreakdown || []}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="ownershipType" />
            <YAxis />
            <Tooltip formatter={(value) => [`₱${Number(value).toFixed(2)}`, 'Expenses']} />
            <Bar dataKey="totalExpenses" fill="#FF8042" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>Monthly Expense Trends</CardTitle>
        <CardDescription>Expense trends over time</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={reportData.monthlyTrends || []}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(value) => [`₱${Number(value).toFixed(2)}`, 'Expenses']} />
            <Line type="monotone" dataKey="totalExpenses" stroke="#FF8042" name="Total Expenses" />
            <Line type="monotone" dataKey="approvedExpenses" stroke="#00C49F" name="Approved Expenses" />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>Budget vs Actual Spending</CardTitle>
        <CardDescription>Budget utilization by category</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={reportData.budgetComparison || []}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="category" />
            <YAxis />
            <Tooltip formatter={(value) => [`₱${Number(value).toFixed(2)}`]} />
            <Bar dataKey="budgetAmount" fill="#8884d8" name="Budget" />
            <Bar dataKey="actualAmount" fill="#82ca9d" name="Actual" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>

    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>Expense Details by Store</CardTitle>
        <CardDescription>Detailed expense breakdown</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {(reportData.storeBreakdown || []).map((store: any, index: number) => (
            <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h4 className="font-medium">{store.storeName}</h4>
                <div className="flex gap-4 text-sm text-gray-600 mt-1">
                  <span>Total: ₱{store.totalExpenses.toFixed(2)}</span>
                  <span>Approved: ₱{store.approvedExpenses.toFixed(2)}</span>
                  <span>Pending: ₱{store.pendingExpenses.toFixed(2)}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold">{store.ownershipType}</p>
                <p className="text-xs text-gray-500">
                  {store.expenseCount} expenses
                </p>
              </div>
            </div>
          ))}
          {(!reportData.storeBreakdown || reportData.storeBreakdown.length === 0) && (
            <div className="text-center py-8 text-gray-500">
              No store expense data available
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  </div>
);