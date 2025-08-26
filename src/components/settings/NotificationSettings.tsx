import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { 
  Bell, 
  Volume2, 
  VolumeX, 
  DollarSign, 
  Package, 
  AlertTriangle,
  Activity,
  Trash2
} from 'lucide-react';
import { 
  realTimeNotificationService, 
  NotificationConfig,
  RealTimeNotification
} from '@/services/notifications/realTimeNotificationService';
import { toast } from 'sonner';

interface NotificationSettingsProps {
  className?: string;
}

export const NotificationSettings: React.FC<NotificationSettingsProps> = ({
  className = ""
}) => {
  const [config, setConfig] = useState<NotificationConfig>({
    showPriceUpdates: true,
    showAvailabilityChanges: true,
    showInventoryAlerts: true,
    showSystemStatus: true,
    soundEnabled: false
  });
  const [notifications, setNotifications] = useState<RealTimeNotification[]>([]);

  useEffect(() => {
    // Load current configuration
    const currentConfig = realTimeNotificationService.getConfig();
    setConfig(currentConfig);
    
    // Load recent notifications
    const recentNotifications = realTimeNotificationService.getNotifications();
    setNotifications(recentNotifications);
  }, []);

  const handleConfigChange = (key: keyof NotificationConfig, value: boolean) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    realTimeNotificationService.updateConfig(newConfig);
    
    toast.success('Notification settings updated');
  };

  const testNotification = () => {
    realTimeNotificationService.showSystemStatusNotification(
      'Test Notification',
      'This is a test notification to verify your settings are working correctly.',
      'info',
      'test-store'
    );
  };

  const clearNotifications = () => {
    realTimeNotificationService.clearNotifications();
    setNotifications([]);
    toast.success('Notification history cleared');
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'price_update':
        return <DollarSign className="h-4 w-4 text-blue-600" />;
      case 'availability_change':
        return <Package className="h-4 w-4 text-green-600" />;
      case 'inventory_alert':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'system_status':
        return <Activity className="h-4 w-4 text-purple-600" />;
      default:
        return <Bell className="h-4 w-4 text-gray-600" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    const variants = {
      info: 'default',
      success: 'default',
      warning: 'secondary',
      error: 'destructive'
    } as const;
    
    return (
      <Badge variant={variants[severity as keyof typeof variants] || 'default'} className="text-xs">
        {severity}
      </Badge>
    );
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Price Updates */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DollarSign className="h-4 w-4 text-blue-600" />
              <div>
                <Label className="text-sm font-medium">Price Updates</Label>
                <p className="text-xs text-muted-foreground">
                  Get notified when product prices change
                </p>
              </div>
            </div>
            <Switch
              checked={config.showPriceUpdates}
              onCheckedChange={(checked) => handleConfigChange('showPriceUpdates', checked)}
            />
          </div>

          {/* Availability Changes */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Package className="h-4 w-4 text-green-600" />
              <div>
                <Label className="text-sm font-medium">Availability Changes</Label>
                <p className="text-xs text-muted-foreground">
                  Get notified when products become available or unavailable
                </p>
              </div>
            </div>
            <Switch
              checked={config.showAvailabilityChanges}
              onCheckedChange={(checked) => handleConfigChange('showAvailabilityChanges', checked)}
            />
          </div>

          {/* Inventory Alerts */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <div>
                <Label className="text-sm font-medium">Inventory Alerts</Label>
                <p className="text-xs text-muted-foreground">
                  Get notified about low stock and out-of-stock items
                </p>
              </div>
            </div>
            <Switch
              checked={config.showInventoryAlerts}
              onCheckedChange={(checked) => handleConfigChange('showInventoryAlerts', checked)}
            />
          </div>

          {/* System Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Activity className="h-4 w-4 text-purple-600" />
              <div>
                <Label className="text-sm font-medium">System Status</Label>
                <p className="text-xs text-muted-foreground">
                  Get notified about system issues and updates
                </p>
              </div>
            </div>
            <Switch
              checked={config.showSystemStatus}
              onCheckedChange={(checked) => handleConfigChange('showSystemStatus', checked)}
            />
          </div>

          {/* Sound Notifications */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {config.soundEnabled ? (
                <Volume2 className="h-4 w-4 text-blue-600" />
              ) : (
                <VolumeX className="h-4 w-4 text-gray-400" />
              )}
              <div>
                <Label className="text-sm font-medium">Sound Notifications</Label>
                <p className="text-xs text-muted-foreground">
                  Play sound alerts for important notifications
                </p>
              </div>
            </div>
            <Switch
              checked={config.soundEnabled}
              onCheckedChange={(checked) => handleConfigChange('soundEnabled', checked)}
            />
          </div>

          {/* Test Button */}
          <div className="pt-4 border-t">
            <Button onClick={testNotification} variant="outline" size="sm">
              Test Notification
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Recent Notifications</CardTitle>
            <Button
              onClick={clearNotifications}
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No recent notifications
            </p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {notifications.slice(0, 10).map((notification) => (
                <div
                  key={notification.id}
                  className="flex items-start gap-3 p-2 bg-gray-50 rounded text-sm"
                >
                  {getNotificationIcon(notification.type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{notification.title}</span>
                      {getSeverityBadge(notification.severity)}
                    </div>
                    <p className="text-muted-foreground text-xs">
                      {notification.message}
                    </p>
                    <p className="text-muted-foreground text-xs mt-1">
                      {notification.timestamp.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationSettings;
