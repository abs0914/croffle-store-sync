
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Database, TestTube } from "lucide-react";
import { DataSource } from "@/services/reports/utils/dataSourceUtils";

interface DataSourceIndicatorProps {
  dataSource: DataSource;
  generatedAt?: string;
  debugInfo?: {
    queryAttempts?: string[];
    fallbackReason?: string;
    recordCount?: number;
  };
  showFullAlert?: boolean;
}

export function DataSourceIndicator({ 
  dataSource, 
  generatedAt, 
  debugInfo,
  showFullAlert = false 
}: DataSourceIndicatorProps) {
  const isDevelopment = window.location.hostname === 'localhost' ||
                        window.location.hostname.includes('staging') ||
                        window.location.hostname.includes('.lovable.app');

  // Don't show sample data indicators in production
  if (!isDevelopment && dataSource === 'sample') {
    return null;
  }

  const getDataSourceInfo = () => {
    switch (dataSource) {
      case 'real':
        return {
          label: 'Live Data',
          variant: 'default' as const,
          icon: Database,
          color: 'text-green-600',
          bgColor: 'bg-green-50 border-green-200',
          description: 'This report shows real data from your database.'
        };
      case 'sample':
        return {
          label: 'Demo Data',
          variant: 'secondary' as const,
          icon: TestTube,
          color: 'text-amber-600',
          bgColor: 'bg-amber-50 border-amber-200',
          description: 'This report shows sample data for demonstration purposes.'
        };
      case 'mixed':
        return {
          label: 'Mixed Data',
          variant: 'outline' as const,
          icon: Info,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50 border-blue-200',
          description: 'This report contains both real and sample data.'
        };
    }
  };

  const info = getDataSourceInfo();
  const Icon = info.icon;

  if (showFullAlert) {
    return (
      <Alert className={`${info.bgColor} ${info.color}`}>
        <Icon className="h-4 w-4" />
        <AlertDescription>
          <div className="flex items-center justify-between">
            <span>{info.description}</span>
            <Badge variant={info.variant} className="ml-2">
              {info.label}
            </Badge>
          </div>
          {generatedAt && (
            <div className="text-xs mt-1 opacity-75">
              Generated: {new Date(generatedAt).toLocaleString()}
            </div>
          )}
          {debugInfo && isDevelopment && (
            <details className="text-xs mt-2 opacity-75">
              <summary className="cursor-pointer">Debug Info</summary>
              <div className="mt-1 pl-2">
                {debugInfo.recordCount !== undefined && (
                  <div>Records found: {debugInfo.recordCount}</div>
                )}
                {debugInfo.fallbackReason && (
                  <div>Fallback reason: {debugInfo.fallbackReason}</div>
                )}
                {debugInfo.queryAttempts && (
                  <div>Query attempts: {debugInfo.queryAttempts.length}</div>
                )}
              </div>
            </details>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Badge variant={info.variant} className="flex items-center gap-1">
      <Icon className="h-3 w-3" />
      {info.label}
    </Badge>
  );
}
