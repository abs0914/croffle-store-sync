
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, RefreshCw, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OrderAuditTrail } from "@/types/orderManagement";
import { fetchAuditTrail, getAuditTrailSummary } from "@/services/orderManagement/auditTrailService";
import { useAuth } from "@/contexts/auth";

export function AuditTrailTab() {
  const { user } = useAuth();
  const [auditTrail, setAuditTrail] = useState<OrderAuditTrail[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [orderTypeFilter, setOrderTypeFilter] = useState<string>('all');
  const [summary, setSummary] = useState<any>(null);

  const loadAuditTrail = async () => {
    try {
      setLoading(true);
      const storeId = user?.storeIds?.[0];
      const orderType = orderTypeFilter === 'all' ? undefined : orderTypeFilter;
      
      const [auditData, summaryData] = await Promise.all([
        fetchAuditTrail(storeId, orderType),
        getAuditTrailSummary(storeId)
      ]);
      
      setAuditTrail(auditData);
      setSummary(summaryData);
    } catch (error) {
      console.error('Error loading audit trail:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuditTrail();
  }, [user, orderTypeFilter]);

  const getActionColor = (action: string) => {
    switch (action) {
      case 'created': return 'default';
      case 'status_change': return 'secondary';
      case 'fulfilled': return 'outline';
      case 'delivered': return 'default';
      case 'cancelled': return 'destructive';
      default: return 'secondary';
    }
  };

  const getOrderTypeColor = (orderType: string) => {
    switch (orderType) {
      case 'purchase': return 'bg-blue-100 text-blue-800';
      case 'delivery': return 'bg-green-100 text-green-800';
      case 'grn': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredTrail = auditTrail.filter(trail =>
    trail.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    trail.order_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    trail.change_reason?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    trail.new_status?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle>Order Audit Trail</CardTitle>
            {summary && (
              <div className="text-sm text-muted-foreground">
                {summary.totalEntries} total entries • 
                {summary.byOrderType.purchase} purchase • 
                {summary.byOrderType.grn} GRN • 
                {summary.byOrderType.delivery} delivery
              </div>
            )}
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadAuditTrail}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search audit trail..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={orderTypeFilter} onValueChange={setOrderTypeFilter}>
            <SelectTrigger className="w-48">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="purchase">Purchase Orders</SelectItem>
              <SelectItem value="grn">Goods Received</SelectItem>
              <SelectItem value="delivery">Deliveries</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        ) : filteredTrail.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              {searchTerm ? 'No audit trail entries found matching your search' : 'No audit trail entries available'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTrail.map((trail) => (
              <div key={trail.id} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge 
                      className={`text-xs ${getOrderTypeColor(trail.order_type)}`}
                      variant="secondary"
                    >
                      {trail.order_type.toUpperCase()}
                    </Badge>
                    <Badge variant={getActionColor(trail.action)}>
                      {trail.action.replace('_', ' ')}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(trail.created_at).toLocaleString()}
                  </span>
                </div>
                
                {trail.old_status && trail.new_status && (
                  <div className="text-sm">
                    Status changed from{' '}
                    <Badge variant="outline" className="text-xs">
                      {trail.old_status}
                    </Badge>
                    {' '}to{' '}
                    <Badge variant="outline" className="text-xs">
                      {trail.new_status}
                    </Badge>
                  </div>
                )}
                
                {trail.change_reason && (
                  <p className="text-sm text-muted-foreground">
                    {trail.change_reason}
                  </p>
                )}

                <div className="text-xs text-muted-foreground pt-1 border-t">
                  Order ID: {trail.order_id.substring(0, 8)}...
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
