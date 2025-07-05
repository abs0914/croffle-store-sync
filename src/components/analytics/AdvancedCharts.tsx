import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Treemap
} from 'recharts';
import { ArrowUp, ArrowDown, TrendingUp, TrendingDown } from 'lucide-react';

interface ChartData {
  [key: string]: any;
}

interface TrendCardProps {
  title: string;
  value: string | number;
  change: number;
  changeType: 'positive' | 'negative' | 'neutral';
  subtitle?: string;
}

export function TrendCard({ title, value, change, changeType, subtitle }: TrendCardProps) {
  const getChangeIcon = () => {
    if (changeType === 'positive') return <ArrowUp className="h-4 w-4 text-green-600" />;
    if (changeType === 'negative') return <ArrowDown className="h-4 w-4 text-red-600" />;
    return <TrendingUp className="h-4 w-4 text-muted-foreground" />;
  };

  const getChangeColor = () => {
    if (changeType === 'positive') return 'text-green-600';
    if (changeType === 'negative') return 'text-red-600';
    return 'text-muted-foreground';
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          <div className={`flex items-center gap-1 ${getChangeColor()}`}>
            {getChangeIcon()}
            <span className="text-sm font-medium">{Math.abs(change)}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface RevenueChartProps {
  data: ChartData[];
  height?: number;
}

export function RevenueChart({ data, height = 300 }: RevenueChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="date" 
              stroke="hsl(var(--muted-foreground))"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={(value) => `₱${value.toLocaleString()}`}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                color: 'hsl(var(--foreground))'
              }}
              formatter={(value: any) => [`₱${value.toLocaleString()}`, 'Revenue']}
            />
            <Area 
              type="monotone" 
              dataKey="revenue" 
              stroke="hsl(var(--primary))" 
              fillOpacity={1}
              fill="url(#revenueGradient)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

interface SalesDistributionProps {
  data: ChartData[];
  height?: number;
}

export function SalesDistribution({ data, height = 300 }: SalesDistributionProps) {
  const COLORS = [
    'hsl(var(--primary))',
    'hsl(var(--secondary))',
    'hsl(var(--accent))',
    'hsl(var(--muted))',
    '#8884d8',
    '#82ca9d',
    '#ffc658',
    '#ff7300'
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sales Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                color: 'hsl(var(--foreground))'
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

interface PerformanceRadarProps {
  data: ChartData[];
  height?: number;
}

export function PerformanceRadar({ data, height = 300 }: PerformanceRadarProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Store Performance Radar</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <RadarChart data={data}>
            <PolarGrid stroke="hsl(var(--border))" />
            <PolarAngleAxis 
              dataKey="metric" 
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <PolarRadiusAxis 
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={(value) => `${value}%`}
            />
            <Radar
              name="Performance"
              dataKey="value"
              stroke="hsl(var(--primary))"
              fill="hsl(var(--primary))"
              fillOpacity={0.3}
              strokeWidth={2}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                color: 'hsl(var(--foreground))'
              }}
              formatter={(value: any) => [`${value}%`, 'Score']}
            />
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

interface InventoryHeatmapProps {
  data: ChartData[];
  height?: number;
}

export function InventoryHeatmap({ data, height = 300 }: InventoryHeatmapProps) {
  const getColor = (value: number) => {
    if (value < 20) return '#ef4444'; // red
    if (value < 50) return '#f97316'; // orange
    if (value < 80) return '#eab308'; // yellow
    return '#22c55e'; // green
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Inventory Status Heatmap</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <Treemap
            data={data}
            dataKey="stockLevel"
            aspectRatio={4 / 3}
            stroke="hsl(var(--background))"
            content={(props: any) => {
              const { x, y, width, height, payload } = props;
              return (
                <g>
                  <rect
                    x={x}
                    y={y}
                    width={width}
                    height={height}
                    style={{
                      fill: getColor(payload.stockLevel),
                      stroke: '#fff',
                      strokeWidth: 2,
                      strokeOpacity: 1,
                    }}
                  />
                  {width > 60 && height > 30 && (
                    <text
                      x={x + width / 2}
                      y={y + height / 2}
                      textAnchor="middle"
                      fill="#fff"
                      fontSize="12"
                      fontWeight="bold"
                    >
                      {payload.name}
                    </text>
                  )}
                </g>
              );
            }}
          />
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

interface HourlyTrafficProps {
  data: ChartData[];
  height?: number;
}

export function HourlyTraffic({ data, height = 300 }: HourlyTrafficProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Hourly Sales Pattern</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="hour" 
              stroke="hsl(var(--muted-foreground))"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={(value) => `${value}:00`}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={(value) => `₱${value.toLocaleString()}`}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                color: 'hsl(var(--foreground))'
              }}
              formatter={(value: any) => [`₱${value.toLocaleString()}`, 'Revenue']}
              labelFormatter={(label) => `${label}:00`}
            />
            <Bar 
              dataKey="revenue" 
              fill="hsl(var(--primary))"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

interface CustomerSegmentationProps {
  data: ChartData[];
  height?: number;
}

export function CustomerSegmentation({ data, height = 300 }: CustomerSegmentationProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Customer Segmentation</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <ScatterChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              type="number" 
              dataKey="frequency" 
              name="Frequency"
              stroke="hsl(var(--muted-foreground))"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis 
              type="number" 
              dataKey="value" 
              name="Value"
              stroke="hsl(var(--muted-foreground))"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={(value) => `₱${value}`}
            />
            <Tooltip 
              cursor={{ strokeDasharray: '3 3' }}
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                color: 'hsl(var(--foreground))'
              }}
              formatter={(value: any, name: string) => [
                name === 'value' ? `₱${value}` : value,
                name === 'value' ? 'Average Value' : 'Frequency'
              ]}
            />
            <Scatter 
              name="Customers" 
              dataKey="value" 
              fill="hsl(var(--primary))"
            />
          </ScatterChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

interface InventoryForecastProps {
  data: ChartData[];
  height?: number;
}

export function InventoryForecast({ data, height = 300 }: InventoryForecastProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Inventory Forecast</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="date" 
              stroke="hsl(var(--muted-foreground))"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                color: 'hsl(var(--foreground))'
              }}
            />
            <Line 
              type="monotone" 
              dataKey="actual" 
              stroke="hsl(var(--primary))" 
              strokeWidth={2}
              name="Actual"
            />
            <Line 
              type="monotone" 
              dataKey="forecast" 
              stroke="hsl(var(--secondary))" 
              strokeWidth={2}
              strokeDasharray="5 5"
              name="Forecast"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

interface AlertSummaryProps {
  alerts: Array<{
    type: 'critical' | 'warning' | 'info';
    title: string;
    description: string;
    value?: string;
  }>;
}

export function AlertSummary({ alerts }: AlertSummaryProps) {
  const getAlertVariant = (type: string) => {
    switch (type) {
      case 'critical': return 'destructive';
      case 'warning': return 'default';
      case 'info': return 'secondary';
      default: return 'secondary';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>System Alerts</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No alerts at this time</p>
        ) : (
          alerts.map((alert, index) => (
            <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={getAlertVariant(alert.type)}>
                    {alert.type.toUpperCase()}
                  </Badge>
                  <span className="font-medium">{alert.title}</span>
                </div>
                <p className="text-sm text-muted-foreground">{alert.description}</p>
              </div>
              {alert.value && (
                <div className="text-right">
                  <span className="font-mono text-lg">{alert.value}</span>
                </div>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

interface ProgressMetricProps {
  title: string;
  current: number;
  target: number;
  unit?: string;
}

export function ProgressMetric({ title, current, target, unit = '' }: ProgressMetricProps) {
  const percentage = Math.min(100, (current / target) * 100);
  const isOnTrack = percentage >= 70;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">{title}</h3>
            <Badge variant={isOnTrack ? 'default' : 'secondary'}>
              {isOnTrack ? 'On Track' : 'Behind'}
            </Badge>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Progress</span>
              <span>{percentage.toFixed(1)}%</span>
            </div>
            <Progress value={percentage} className="h-2" />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{current.toLocaleString()}{unit}</span>
              <span>Target: {target.toLocaleString()}{unit}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}