
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { Shield, AlertTriangle, Eye, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

interface SecurityEvent {
  id: string;
  event_type: string;
  event_details: any;
  created_at: string;
  user_id: string;
  ip_address?: string;
  user_agent?: string;
}

export function SecurityMonitoringDashboard() {
  const { hasPermission } = useAuth();
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalEvents: 0,
    failedLogins: 0,
    suspiciousActivities: 0,
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
      // Since the security_audit_log table might not be in the types yet,
      // we'll use a more generic approach or create mock data for now
      const mockEvents: SecurityEvent[] = [
        {
          id: '1',
          event_type: 'login_success',
          event_details: { email: 'user@example.com' },
          created_at: new Date().toISOString(),
          user_id: 'user-1',
          user_agent: 'Mozilla/5.0...'
        }
      ];

      setEvents(mockEvents);
      
      // Calculate stats
      const failedLogins = mockEvents.filter(e => e.event_type === 'login_failed').length;
      const suspiciousActivities = mockEvents.filter(e => 
        e.event_type.includes('suspicious') || e.event_type === 'session_invalid'
      ).length;
      
      setStats({
        totalEvents: mockEvents.length,
        failedLogins,
        suspiciousActivities,
        lastUpdate: new Date()
      });
    } catch (error) {
      console.error('Error fetching security events:', error);
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

  const getEventSeverity = (eventType: string) => {
    if (eventType.includes('failed') || eventType.includes('suspicious')) {
      return 'destructive';
    }
    if (eventType.includes('success')) {
      return 'default';
    }
    return 'secondary';
  };

  const getEventIcon = (eventType: string) => {
    if (eventType.includes('failed') || eventType.includes('suspicious')) {
      return <AlertTriangle className="h-4 w-4" />;
    }
    return <Eye className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Security Monitoring</h2>
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
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEvents}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Failed Logins</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.failedLogins}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Suspicious Activities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.suspiciousActivities}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Last Updated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-gray-600">
              {format(stats.lastUpdate, 'HH:mm:ss')}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Security Events */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Security Events</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {events.map((event) => (
              <div key={event.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getEventIcon(event.event_type)}
                  <div>
                    <div className="font-medium">{event.event_type.replace(/_/g, ' ').toUpperCase()}</div>
                    <div className="text-sm text-gray-600">
                      {format(new Date(event.created_at), 'MMM dd, yyyy HH:mm:ss')}
                    </div>
                    {event.event_details && (
                      <div className="text-xs text-gray-500 mt-1">
                        {typeof event.event_details === 'string' 
                          ? event.event_details 
                          : JSON.stringify(event.event_details, null, 2)}
                      </div>
                    )}
                  </div>
                </div>
                <Badge variant={getEventSeverity(event.event_type)}>
                  {event.event_type}
                </Badge>
              </div>
            ))}
            
            {events.length === 0 && !isLoading && (
              <div className="text-center text-gray-500 py-8">
                <Shield className="h-12 w-12 mx-auto mb-2 opacity-30" />
                <p>No security events found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
