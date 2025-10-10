import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Database, TestTube } from "lucide-react";
import { DataSource } from "@/services/reports/utils/dataSourceUtils";
import { formatDateTime } from "@/utils/format";
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
  const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname.includes('staging') || window.location.hostname.includes('.lovable.app');

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
    return;
  }
  return <Badge variant={info.variant} className="flex items-center gap-1">
      <Icon className="h-3 w-3" />
      {info.label}
    </Badge>;
}