import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Wifi, WifiOff, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface RealTimeSyncStatusProps {
  isConnected: boolean;
  lastSync: Date;
  className?: string;
}

export const RealTimeSyncStatus: React.FC<RealTimeSyncStatusProps> = ({
  isConnected,
  lastSync,
  className = ""
}) => {
  return (
    <div className={`flex items-center gap-2 text-sm ${className}`}>
      <div className="flex items-center gap-1">
        {isConnected ? (
          <Wifi className="h-4 w-4 text-green-500" />
        ) : (
          <WifiOff className="h-4 w-4 text-red-500" />
        )}
        <Badge 
          variant={isConnected ? "default" : "destructive"}
          className="text-xs"
        >
          {isConnected ? 'Live' : 'Offline'}
        </Badge>
      </div>
      
      <div className="flex items-center gap-1 text-muted-foreground">
        <Clock className="h-3 w-3" />
        <span className="text-xs">
          Updated {formatDistanceToNow(lastSync, { addSuffix: true })}
        </span>
      </div>
    </div>
  );
};

export default RealTimeSyncStatus;
