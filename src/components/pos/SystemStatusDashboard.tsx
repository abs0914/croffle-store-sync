import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Wifi, 
  WifiOff, 
  Database, 
  RefreshCw, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  Activity,
  Clock,
  Zap
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

interface SystemStatusDashboardProps {
  storeId: string;
  isConnected: boolean;
  lastSync: Date;
  className?: string;
}

interface SystemHealth {
  database: 'healthy' | 'slow' | 'error';
  realtime: 'connected' | 'disconnected' | 'reconnecting';
  lastActivity: Date;
  responseTime: number;
}

export const SystemStatusDashboard: React.FC<SystemStatusDashboardProps> = ({
  storeId,
  isConnected,
  lastSync,
  className = ""
}) => {
  const [systemHealth, setSystemHealth] = useState<SystemHealth>({
    database: 'healthy',
    realtime: 'connected',
    lastActivity: new Date(),
    responseTime: 0
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  const checkSystemHealth = async () => {
    const startTime = Date.now();
    
    try {
      // Test database connectivity
      const { data, error } = await supabase
        .from('product_catalog')
        .select('id')
        .eq('store_id', storeId)
        .limit(1);

      const responseTime = Date.now() - startTime;

      setSystemHealth(prev => ({
        ...prev,
        database: error ? 'error' : responseTime > 2000 ? 'slow' : 'healthy',
        realtime: isConnected ? 'connected' : 'disconnected',
        lastActivity: new Date(),
        responseTime
      }));

    } catch (error) {
      setSystemHealth(prev => ({
        ...prev,
        database: 'error',
        lastActivity: new Date(),
        responseTime: Date.now() - startTime
      }));
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await checkSystemHealth();
    
    // Force refresh of product data
    window.location.reload();
    
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  useEffect(() => {
    checkSystemHealth();
    
    // Check system health every 30 seconds
    const interval = setInterval(checkSystemHealth, 30000);
    
    return () => clearInterval(interval);
  }, [storeId, isConnected]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'slow':
      case 'reconnecting':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'error':
      case 'disconnected':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string, label: string) => {
    const variant = status === 'healthy' || status === 'connected' 
      ? 'default' 
      : status === 'slow' || status === 'reconnecting'
      ? 'secondary'
      : 'destructive';
    
    return (
      <Badge variant={variant} className="text-xs">
        {label}
      </Badge>
    );
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="h-4 w-4" />
            System Status
          </CardTitle>
          <Button
            onClick={handleRefresh}
            disabled={isRefreshing}
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
          >
            <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Real-time Connection */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isConnected ? (
              <Wifi className="h-4 w-4 text-green-600" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-600" />
            )}
            <span className="text-sm">Real-time</span>
          </div>
          {getStatusBadge(
            systemHealth.realtime, 
            systemHealth.realtime === 'connected' ? 'Live' : 'Offline'
          )}
        </div>

        {/* Database Health */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            <span className="text-sm">Database</span>
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon(systemHealth.database)}
            {getStatusBadge(
              systemHealth.database,
              systemHealth.database === 'healthy' 
                ? 'Healthy' 
                : systemHealth.database === 'slow' 
                ? 'Slow' 
                : 'Error'
            )}
          </div>
        </div>

        {/* Response Time */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            <span className="text-sm">Response</span>
          </div>
          <div className="text-xs text-muted-foreground">
            {systemHealth.responseTime}ms
          </div>
        </div>

        {/* Last Sync */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span className="text-sm">Last Sync</span>
          </div>
          <div className="text-xs text-muted-foreground">
            {formatDistanceToNow(lastSync, { addSuffix: true })}
          </div>
        </div>

        {/* Overall Status */}
        <div className="pt-2 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Overall</span>
            {systemHealth.database === 'healthy' && isConnected ? (
              <Badge variant="default" className="text-xs">
                <CheckCircle className="h-3 w-3 mr-1" />
                All Systems Operational
              </Badge>
            ) : (
              <Badge variant="destructive" className="text-xs">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Issues Detected
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SystemStatusDashboard;
