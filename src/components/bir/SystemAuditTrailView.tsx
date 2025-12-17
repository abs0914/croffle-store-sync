import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Archive, 
  Download, 
  Printer, 
  FileText, 
  ChevronDown, 
  ChevronRight,
  Filter,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { useStore } from '@/contexts/StoreContext';
import { SystemAuditTrailService, UnifiedAuditEntry } from '@/services/bir/systemAuditTrailService';
import { AuditTrailExportService } from '@/services/bir/auditTrailExportService';
import { format, subDays } from 'date-fns';
import { toast } from 'sonner';

export default function SystemAuditTrailView() {
  const { currentStore } = useStore();
  const [entries, setEntries] = useState<UnifiedAuditEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  
  // Filters
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [activityType, setActivityType] = useState('all');

  useEffect(() => {
    if (currentStore?.id) {
      loadAuditTrail();
    }
  }, [currentStore?.id]);

  const loadAuditTrail = async () => {
    if (!currentStore?.id) return;
    
    setIsLoading(true);
    try {
      const data = await SystemAuditTrailService.getUnifiedAuditTrail({
        storeId: currentStore.id,
        startDate,
        endDate,
        activityType: activityType === 'all' ? undefined : activityType,
        limit: 500
      });
      setEntries(data);
    } catch (error) {
      console.error('Error loading audit trail:', error);
      toast.error('Failed to load audit trail');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilter = () => {
    loadAuditTrail();
  };

  const toggleRowExpanded = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const getExportOptions = () => ({
    storeName: currentStore?.business_name || currentStore?.name || 'Store',
    storeAddress: currentStore?.address || '',
    tin: currentStore?.tin || 'N/A',
    startDate,
    endDate,
    entries
  });

  const handlePrint = () => {
    AuditTrailExportService.printBrowser(getExportOptions());
  };

  const handleExportPDF = () => {
    AuditTrailExportService.generatePDF(getExportOptions());
    toast.success('PDF downloaded');
  };

  const handleExportCSV = () => {
    AuditTrailExportService.generateCSV(getExportOptions());
    toast.success('CSV downloaded');
  };

  const getActivityTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'transaction': return 'bg-green-100 text-green-800';
      case 'system': return 'bg-blue-100 text-blue-800';
      case 'security': return 'bg-yellow-100 text-yellow-800';
      case 'expense': return 'bg-purple-100 text-purple-800';
      case 'user_management': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5" />
            System Audit Trail
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPDF}>
              <FileText className="h-4 w-4 mr-2" />
              PDF
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-2" />
              CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap items-end gap-4 p-4 bg-muted/50 rounded-lg">
          <div>
            <Label htmlFor="startDate" className="text-sm">Start Date</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-auto"
            />
          </div>
          <div>
            <Label htmlFor="endDate" className="text-sm">End Date</Label>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-auto"
            />
          </div>
          <div>
            <Label htmlFor="activityType" className="text-sm">Activity Type</Label>
            <Select value={activityType} onValueChange={setActivityType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SystemAuditTrailService.getActivityTypes().map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleFilter} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Filter className="h-4 w-4 mr-2" />
            )}
            Apply Filter
          </Button>
          <Button variant="ghost" onClick={loadAuditTrail} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Results count */}
        <div className="text-sm text-muted-foreground">
          Showing {entries.length} entries
        </div>

        {/* Audit Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No audit entries found for the selected filters
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead className="w-[160px]">Date & Time</TableHead>
                  <TableHead className="w-[120px]">User</TableHead>
                  <TableHead className="w-[120px]">Type</TableHead>
                  <TableHead>Activity</TableHead>
                  <TableHead>Data Values</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <React.Fragment key={entry.id}>
                    <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => toggleRowExpanded(entry.id)}>
                      <TableCell>
                        {expandedRows.has(entry.id) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {format(new Date(entry.timestamp), 'MM/dd/yyyy HH:mm:ss')}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {entry.userName || entry.userId?.slice(0, 8) || 'System'}
                        </div>
                        {entry.userRole && (
                          <div className="text-xs text-muted-foreground">{entry.userRole}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={getActivityTypeBadgeColor(entry.activityType)}>
                          {entry.activityType.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {entry.activity.replace(/_/g, ' ')}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate">
                        {SystemAuditTrailService.formatDataValues(entry.dataValues).slice(0, 60)}
                        {SystemAuditTrailService.formatDataValues(entry.dataValues).length > 60 && '...'}
                      </TableCell>
                    </TableRow>
                    {expandedRows.has(entry.id) && (
                      <TableRow>
                        <TableCell colSpan={6} className="bg-muted/30 p-4">
                          <div className="space-y-2">
                            <div className="text-sm font-medium">Full Details:</div>
                            <pre className="text-xs bg-background p-3 rounded border overflow-x-auto">
                              {JSON.stringify(entry.dataValues, null, 2)}
                            </pre>
                            <div className="flex gap-4 text-xs text-muted-foreground">
                              <span>Source: {entry.sourceTable}</span>
                              {entry.userId && <span>User ID: {entry.userId}</span>}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
