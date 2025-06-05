
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import { OrderAuditTrail } from "@/types/orderManagement";
import { supabase } from "@/integrations/supabase/client";

export function AuditTrailTab() {
  const [auditTrail, setAuditTrail] = useState<OrderAuditTrail[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const loadAuditTrail = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('order_audit_trail')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setAuditTrail(data || []);
    } catch (error) {
      console.error('Error fetching audit trail:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuditTrail();
  }, []);

  const getActionColor = (action: string) => {
    switch (action) {
      case 'status_change': return 'default';
      case 'created': return 'success';
      case 'updated': return 'warning';
      case 'deleted': return 'destructive';
      default: return 'secondary';
    }
  };

  const filteredTrail = auditTrail.filter(trail =>
    trail.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    trail.order_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    trail.change_reason?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Order Audit Trail</CardTitle>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search audit trail..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
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
              <div key={trail.id} className="border rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={getActionColor(trail.action)}>
                      {trail.action.replace('_', ' ')}
                    </Badge>
                    <span className="text-sm font-medium">
                      {trail.order_type.toUpperCase()} Order
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(trail.created_at).toLocaleString()}
                  </span>
                </div>
                
                {trail.old_status && trail.new_status && (
                  <div className="mt-2 text-sm">
                    Status changed from <Badge variant="outline">{trail.old_status}</Badge> to{' '}
                    <Badge variant="outline">{trail.new_status}</Badge>
                  </div>
                )}
                
                {trail.change_reason && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {trail.change_reason}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
