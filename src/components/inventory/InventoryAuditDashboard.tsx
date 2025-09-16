import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { useInventoryAuditReport } from '@/hooks/useInventoryAuditReport';
import { format } from 'date-fns';

interface InventoryAuditDashboardProps {
  storeId: string;
}

export const InventoryAuditDashboard: React.FC<InventoryAuditDashboardProps> = ({ storeId }) => {
  const { summary, loading, error, refetch } = useInventoryAuditReport(storeId);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <RefreshCw className="animate-spin mr-2" />
          Loading audit report...
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8 text-destructive">
          <AlertCircle className="mr-2" />
          Error: {error}
        </CardContent>
      </Card>
    );
  }

  if (!summary) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          No audit data available
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Inventory Audit Dashboard</h2>
        <Button onClick={refetch} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Audit Records</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalTransactions}</div>
            <p className="text-xs text-muted-foreground">All time inventory transactions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Records</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.todayTransactions}</div>
            <p className="text-xs text-muted-foreground">Transactions logged today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Audit Status</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Active</div>
            <p className="text-xs text-muted-foreground">Audit logging functional</p>
          </CardContent>
        </Card>
      </div>

      {/* Transaction Types */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction Types</CardTitle>
          <CardDescription>Breakdown of inventory movements by type</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {Object.entries(summary.transactionsByType).map(([type, count]) => (
              <Badge key={type} variant="secondary">
                {type}: {count}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Audit Records</CardTitle>
          <CardDescription>Latest inventory transaction audit entries</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {summary.recentTransactions.slice(0, 10).map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={transaction.transaction_type === 'sale' ? 'default' : 'secondary'}>
                      {transaction.transaction_type}
                    </Badge>
                    <span className="text-sm font-medium">
                      Qty: {transaction.quantity}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{transaction.notes}</p>
                  <p className="text-xs text-muted-foreground">
                    {transaction.previous_quantity} → {transaction.new_quantity}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(transaction.created_at), 'MMM d, HH:mm')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Ref: {transaction.reference_id?.slice(-8)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};