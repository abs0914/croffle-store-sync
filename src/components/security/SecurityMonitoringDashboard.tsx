
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { Shield, AlertTriangle, Eye, RefreshCw, TrendingUp, Activity } from 'lucide-react';
import { format } from 'date-fns';

interface SecurityEvent {
  id: string;
  event_type: string;
  event_details: any;
  created_at: string;
  user_id: string;
  ip_address?: string;
  user_agent?: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
}

export function SecurityMonitoringDashboard() {
  const { hasPermission } = useAuth();
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalEvents: 0,
    failedLogins: 0,
    suspiciousActivities: 0,
    criticalEvents: 0,
    lastUpdate: new Date()
  });

  // Only show to admins
  if (!hasPermission('admin')) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-gray-500">
            <Shield className="h-12 w-12 mx-auto mb-2 opacity-30" />
            <p>Access denied. Admin privileges required.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const fetchSecurityEvents = async () => {
    try {
      setIsLoading(true);
      
      // Fetch recent security events from the new audit log table
      const { data: auditEvents, error } = await supabase
        .from('security_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching security events:', error);
        // Fallback to mock data if database query fails
        setEvents([]);
      } else {
        // Transform the data to match our SecurityEvent interface
        const transformedEvents: SecurityEvent[] = (auditEvents || []).map(event => ({
          id: event.id,
          event_type: event.event_type,
          event_details: event.event_details,
          created_at: event.created_at,
          user_id: event.user_id || '',
          ip_address: event.ip_address ? String(event.ip_address) : undefined,
          user_agent: event.user_agent || undefined,
          severity: event.severity as 'info' | 'warning' | 'error' | 'critical'
        }));
        
        setEvents(transformedEvents);
      }
      
      // Calculate stats from the fetched events
      const totalEvents = auditEvents?.length || 0;
      const failedLogins = auditEvents?.filter(e => 
        e.event_type === 'login_failed' || e.event_type === 'login_rate_limited'
      ).length || 0;
      
      const suspiciousActivities = auditEvents?.filter(e => 
        e.event_type.includes('suspicious') || 
        e.event_type === 'session_invalid' ||
        e.severity === 'warning'
      ).length || 0;

      const criticalEvents = auditEvents?.filter(e => 
        e.severity === 'critical' || e.severity === 'error'
      ).length || 0;
      
      setStats({
        totalEvents,
        failedLogins,
        suspiciousActivities,
        criticalEvents,
        lastUpdate: new Date()
      });
    } catch (error) {
      console.error('Error fetching security events:', error);
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSecurityEvents();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchSecurityEvents, 30000);
    return () => clearInterval(interval);
  }, []);

  const getSeverityVariant = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'destructive';
      case 'error':
        return 'destructive';
      case 'warning':
        return 'secondary';
      case 'info':
      default:
        return 'outline';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info':
      default:
        return <Activity className="h-4 w-4 text-blue-500" />;
    }
  };

  const formatEventDetails = (details: any) => {
    if (!details) return '';
    if (typeof details === 'string') return details;
    
    // Format common details nicely
    const formatted = [];
    if (details.email) formatted.push(`Email: ${details.email}`);
    if (details.error) formatted.push(`Error: ${details.error}`);
    if (details.attempt_number) formatted.push(`Attempt: ${details.attempt_number}`);
    
    return formatted.length > 0 ? formatted.join(', ') : JSON.stringify(details);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Security Monitoring Dashboard</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchSecurityEvents}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Security Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Total Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEvents}</div>
            <p className="text-xs text-muted-foreground">Last 24 hours</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Failed Logins
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.failedLogins}</div>
            <p className="text-xs text-muted-foreground">Authentication failures</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Eye className="h-4 w-4 text-yellow-500" />
              Suspicious Activities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.suspiciousActivities}</div>
            <p className="text-xs text-muted-foreground">Requires attention</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-500" />
              Critical Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.criticalEvents}</div>
            <p className="text-xs text-muted-foreground">High priority</p>
          </CardContent>
        </Card>
      </div>

      {/* Security Events */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Recent Security Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {events.map((event) => (
              <div key={event.id} className="flex items-start justify-between p-3 border rounded-lg hover:bg-gray-50">
                <div className="flex items-start gap-3 flex-1">
                  {getSeverityIcon(event.severity)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">
                        {event.event_type.replace(/_/g, ' ').toUpperCase()}
                      </span>
                      <Badge variant={getSeverityVariant(event.severity)} className="text-xs">
                        {event.severity}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600 mb-1">
                      {format(new Date(event.created_at), 'MMM dd, yyyy HH:mm:ss')}
                    </div>
                    {event.event_details && (
                      <div className="text-xs text-gray-500 mt-1 font-mono bg-gray-100 p-1 rounded">
                        {formatEventDetails(event.event_details)}
                      </div>
                    )}
                    {event.user_agent && (
                      <div className="text-xs text-gray-400 mt-1 truncate">
                        User Agent: {event.user_agent.substring(0, 100)}...
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {events.length === 0 && !isLoading && (
              <div className="text-center text-gray-500 py-8">
                <Shield className="h-12 w-12 mx-auto mb-2 opacity-30" />
                <p>No security events found</p>
                <p className="text-sm">This is a good sign!</p>
              </div>
            )}

            {isLoading && (
              <div className="text-center text-gray-500 py-8">
                <RefreshCw className="h-8 w-8 mx-auto mb-2 animate-spin" />
                <p>Loading security events...</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
