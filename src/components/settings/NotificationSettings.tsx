import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell } from 'lucide-react';

interface NotificationSettingsProps {
  className?: string;
}

export const NotificationSettings: React.FC<NotificationSettingsProps> = ({
  className = ""
}) => {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification Settings
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8">
          <Badge variant="outline" className="mb-4">
            Simplified
          </Badge>
          <p className="text-muted-foreground">
            Notifications have been simplified to use toast messages.
            Complex real-time notification system removed during cleanup.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};