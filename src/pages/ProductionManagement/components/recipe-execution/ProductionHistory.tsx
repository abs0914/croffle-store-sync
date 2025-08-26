import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  History, 
  RefreshCw, 
  Calendar,
  Package,
  DollarSign,
  User,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ProductionExecution {
  id: string;
  recipe_template_id: string;
  recipe_name: string;
  quantity_produced: number;
  total_cost: number;
  executed_by: string;
  executed_at: string;
  status: 'completed' | 'failed' | 'in_progress';
  store_id?: string;
  notes?: string;
  recipe_templates?: {
    name: string;
    description?: string;
  };
}

interface ProductionHistoryProps {
  history: ProductionExecution[];
  onRefresh: () => void;
}

export const ProductionHistory: React.FC<ProductionHistoryProps> = ({
  history,
  onRefresh
}) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-orange-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-600">Completed</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'in_progress':
        return <Badge variant="secondary" className="bg-orange-100 text-orange-800">In Progress</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getTotalStats = () => {
    const completedProductions = history.filter(h => h.status === 'completed');
    const totalCost = completedProductions.reduce((sum, h) => sum + h.total_cost, 0);
    const totalQuantity = completedProductions.reduce((sum, h) => sum + h.quantity_produced, 0);
    
    return {
      totalProductions: completedProductions.length,
      totalCost,
      totalQuantity
    };
  };

  const stats = getTotalStats();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Production History
          </CardTitle>
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">Total Productions</span>
            </div>
            <div className="text-2xl font-bold text-blue-900">{stats.totalProductions}</div>
            <div className="text-sm text-blue-700">completed batches</div>
          </div>

          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-900">Total Investment</span>
            </div>
            <div className="text-2xl font-bold text-green-900">₱{stats.totalCost.toFixed(2)}</div>
            <div className="text-sm text-green-700">in production costs</div>
          </div>

          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-900">Total Yield</span>
            </div>
            <div className="text-2xl font-bold text-purple-900">{stats.totalQuantity}</div>
            <div className="text-sm text-purple-700">servings produced</div>
          </div>
        </div>

        {/* Production History List */}
        <div className="space-y-3">
          {history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No production history yet</p>
              <p className="text-sm">Start executing recipes to see production history here</p>
            </div>
          ) : (
            history.map(execution => (
              <Card key={execution.id} className="border-l-4 border-l-blue-500">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(execution.status)}
                        <h3 className="font-semibold">{execution.recipe_name}</h3>
                        {getStatusBadge(execution.status)}
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Quantity:</span>
                          <div className="font-medium">{execution.quantity_produced} servings</div>
                        </div>
                        
                        <div>
                          <span className="text-muted-foreground">Cost:</span>
                          <div className="font-medium">₱{execution.total_cost.toFixed(2)}</div>
                        </div>
                        
                        <div>
                          <span className="text-muted-foreground">Executed:</span>
                          <div className="font-medium">
                            {formatDistanceToNow(new Date(execution.executed_at), { addSuffix: true })}
                          </div>
                        </div>

                        <div>
                          <span className="text-muted-foreground">Cost/serving:</span>
                          <div className="font-medium">
                            ₱{(execution.total_cost / execution.quantity_produced).toFixed(2)}
                          </div>
                        </div>
                      </div>

                      {execution.notes && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Notes:</span>
                          <div className="italic">{execution.notes}</div>
                        </div>
                      )}
                    </div>

                    <div className="text-right text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(execution.executed_at).toLocaleDateString()}
                      </div>
                      <div className="mt-1">
                        {new Date(execution.executed_at).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};