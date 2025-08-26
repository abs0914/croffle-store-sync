import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth";
import { supabase } from "@/integrations/supabase/client";
import { Shield, AlertTriangle, Clock, User } from "lucide-react";
import { format } from "date-fns";

interface RoleAuditEntry {
  id: string;
  user_id: string;
  old_role: string;
  new_role: string;
  changed_by: string;
  changed_at: string;
  reason: string;
  ip_address?: string | null;
  user_agent?: string | null;
}

export function SecurityAuditPanel() {
  const { user } = useAuth();
  const [auditLogs, setAuditLogs] = useState<RoleAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Only show to admin/owner users
  if (!user || !['admin', 'owner'].includes(user.role)) {
    return null;
  }

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_role_audit')
        .select('*')
        .order('changed_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching audit logs:', error);
        setError('Failed to load audit logs');
      } else {
        setAuditLogs((data as RoleAuditEntry[]) || []);
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'owner': return 'bg-purple-100 text-purple-800';
      case 'manager': return 'bg-yellow-100 text-yellow-800';
      case 'stock_user': return 'bg-blue-100 text-blue-800';
      case 'production_user': return 'bg-green-100 text-green-800';
      case 'cashier': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const isHighRiskChange = (oldRole: string, newRole: string) => {
    const highRoles = ['admin', 'owner'];
    return !highRoles.includes(oldRole) && highRoles.includes(newRole);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Audit Log
          </CardTitle>
          <CardDescription>Loading audit entries...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Security Audit Log - Error
          </CardTitle>
          <CardDescription className="text-red-600">{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={fetchAuditLogs} variant="outline">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Security Audit Log
        </CardTitle>
        <CardDescription>
          Role changes and security events ({auditLogs.length} recent entries)
        </CardDescription>
        <Button onClick={fetchAuditLogs} variant="outline" size="sm">
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {auditLogs.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            No audit entries found
          </p>
        ) : (
          <div className="space-y-3">
            {auditLogs.map((entry) => (
              <div
                key={entry.id}
                className={`border rounded-lg p-3 ${
                  isHighRiskChange(entry.old_role, entry.new_role)
                    ? 'border-red-200 bg-red-50'
                    : 'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">Role Change</span>
                      {isHighRiskChange(entry.old_role, entry.new_role) && (
                        <Badge variant="destructive" className="text-xs">
                          High Risk
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={getRoleColor(entry.old_role)}>
                        {entry.old_role}
                      </Badge>
                      <span className="text-gray-500">→</span>
                      <Badge className={getRoleColor(entry.new_role)}>
                        {entry.new_role}
                      </Badge>
                    </div>

                    {entry.reason && (
                      <p className="text-sm text-gray-600 mb-2">
                        Reason: {entry.reason}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(entry.changed_at), 'MMM dd, yyyy HH:mm')}
                      </span>
                      {entry.ip_address && (
                        <span>IP: {entry.ip_address}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}