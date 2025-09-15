import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TransactionHealthDashboard } from '@/components/dashboard/TransactionHealthDashboard';
import { SystemCompletionDashboard } from '@/components/debug/SystemCompletionDashboard';
import { LoadTestRunner } from '@/components/debug/LoadTestRunner';
import { TransactionTestRunner } from '@/components/debug/TransactionTestRunner';
import { InventoryDeductionValidator } from '@/components/debug/InventoryDeductionValidator';
import MixMatchDeductionTester from '@/components/debug/MixMatchDeductionTester';
import MixMatchPortionTester from '@/components/debug/MixMatchPortionTester';
import { Shield, Activity, Zap, Settings } from 'lucide-react';

export function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
      </div>

      <Tabs defaultValue="system-overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="system-overview" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            System Overview
          </TabsTrigger>
          <TabsTrigger value="health-monitoring" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Health Monitoring
          </TabsTrigger>
          <TabsTrigger value="performance-testing" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Performance Testing
          </TabsTrigger>
          <TabsTrigger value="debug-tools" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Debug Tools
          </TabsTrigger>
        </TabsList>

        <TabsContent value="system-overview" className="space-y-4">
          <SystemCompletionDashboard />
        </TabsContent>

        <TabsContent value="health-monitoring" className="space-y-4">
          <TransactionHealthDashboard />
        </TabsContent>

        <TabsContent value="performance-testing" className="space-y-4">
          <LoadTestRunner />
        </TabsContent>

        <TabsContent value="debug-tools" className="space-y-4">
          <div className="grid gap-4">
            <TransactionTestRunner />
            <InventoryDeductionValidator />
            <MixMatchDeductionTester />
            <MixMatchPortionTester />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}