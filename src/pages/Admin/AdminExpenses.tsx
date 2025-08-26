
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import AdminExpensesDashboard from './components/AdminExpensesDashboard';
import AdminExpenseApprovals from './components/AdminExpenseApprovals';
import AdminExpenseBudgets from './components/AdminExpenseBudgets';
import AdminExpenseReports from './components/AdminExpenseReports';
import AdminExpenseAuditTrail from './components/AdminExpenseAuditTrail';
import AdminExpenseAdvancedReports from './components/AdminExpenseAdvancedReports';

export default function AdminExpenses() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Expense Management</h1>
        <p className="text-muted-foreground">Manage expenses, budgets, and approvals across all stores</p>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="approvals">Approvals</TabsTrigger>
          <TabsTrigger value="budgets">Budgets</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
          <TabsTrigger value="audit">Audit Trail</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <AdminExpensesDashboard />
        </TabsContent>

        <TabsContent value="approvals">
          <AdminExpenseApprovals />
        </TabsContent>

        <TabsContent value="budgets">
          <AdminExpenseBudgets />
        </TabsContent>

        <TabsContent value="reports">
          <AdminExpenseReports />
        </TabsContent>

        <TabsContent value="advanced">
          <AdminExpenseAdvancedReports />
        </TabsContent>

        <TabsContent value="audit">
          <AdminExpenseAuditTrail />
        </TabsContent>
      </Tabs>
    </div>
  );
}
