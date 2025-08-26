import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  Shield, 
  FileCheck, 
  AlertTriangle, 
  Calendar,
  Download,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  BookOpen,
  Archive,
  TestTube
} from 'lucide-react';
import BIRTestingDashboard from '@/components/bir/BIRTestingDashboard';
import { useStore } from '@/contexts/StoreContext';
import { BIRComplianceService } from '@/services/bir/birComplianceService';
import { BIRComplianceStatus, BIRAuditLog, BIRCumulativeSales, BIREJournal } from '@/types/bir';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function BIRCompliance() {
  const { currentStore } = useStore();
  const [complianceStatus, setComplianceStatus] = useState<BIRComplianceStatus | null>(null);
  const [auditLogs, setAuditLogs] = useState<BIRAuditLog[]>([]);
  const [cumulativeSales, setCumulativeSales] = useState<BIRCumulativeSales | null>(null);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (currentStore?.id) {
      loadComplianceData();
    }
  }, [currentStore?.id]);

  const loadComplianceData = async () => {
    if (!currentStore?.id) return;
    
    setIsLoading(true);
    try {
      const [status, logs, cumulative] = await Promise.all([
        BIRComplianceService.checkComplianceStatus(currentStore.id),
        BIRComplianceService.getAuditLogs(currentStore.id, undefined, undefined, undefined, 50),
        BIRComplianceService.getCumulativeSales(currentStore.id)
      ]);

      setComplianceStatus(status);
      setAuditLogs(logs);
      setCumulativeSales(cumulative);
    } catch (error) {
      console.error('Error loading compliance data:', error);
      toast.error('Failed to load compliance data');
    } finally {
      setIsLoading(false);
    }
  };

  const generateEJournal = async () => {
    if (!currentStore?.id) return;
    
    try {
      const ejournal = await BIRComplianceService.generateEJournal(currentStore.id, selectedDate);
      if (ejournal) {
        toast.success('E-Journal generated successfully');
        // Trigger download or display
      } else {
        toast.info('No transactions found for the selected date');
      }
    } catch (error) {
      console.error('Error generating e-journal:', error);
      toast.error('Failed to generate e-journal');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'expired':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      default:
        return <XCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">BIR Compliance</h1>
            <p className="text-muted-foreground">
              Bureau of Internal Revenue compliance monitoring and reporting
            </p>
          </div>
        </div>
        <Button onClick={loadComplianceData} variant="outline">
          Refresh Data
        </Button>
      </div>

      {/* Compliance Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Compliance Status</p>
                <p className="text-lg font-semibold">
                  {complianceStatus?.isCompliant ? 'Compliant' : 'Non-Compliant'}
                </p>
              </div>
              {complianceStatus?.isCompliant ? (
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              ) : (
                <XCircle className="h-8 w-8 text-red-600" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Accreditation</p>
                <div className="flex items-center gap-2">
                  {getStatusIcon(complianceStatus?.accreditationStatus || 'pending')}
                  <Badge className={getStatusColor(complianceStatus?.accreditationStatus || 'pending')}>
                    {complianceStatus?.accreditationStatus || 'Unknown'}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div>
                <p className="text-sm text-muted-foreground">Grand Total Sales</p>
                <p className="text-lg font-semibold">
                  ₱{cumulativeSales?.grandTotalSales?.toLocaleString() || '0.00'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {cumulativeSales?.grandTotalTransactions || 0} transactions
                </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-sm text-muted-foreground">Missing Requirements</p>
              <p className="text-lg font-semibold">
                {complianceStatus?.missingRequirements?.length || 0}
              </p>
              <p className="text-xs text-muted-foreground">
                {complianceStatus?.warnings?.length || 0} warnings
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {(complianceStatus?.missingRequirements?.length || 0) > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900">Missing Requirements</h3>
                <ul className="text-sm text-red-700 mt-1 list-disc list-inside">
                  {complianceStatus?.missingRequirements?.map((field, index) => (
                    <li key={index}>{field}</li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="testing">Testing</TabsTrigger>
          <TabsTrigger value="ejournal">E-Journal</TabsTrigger>
          <TabsTrigger value="audit">Audit Logs</TabsTrigger>
          <TabsTrigger value="cumulative">Cumulative Sales</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="h-5 w-5" />
                Store Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Business Name</Label>
                  <p className="text-sm">{currentStore?.business_name || 'Not Set'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">TIN</Label>
                  <p className="text-sm">{currentStore?.tin || 'Not Set'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Machine Accreditation Number</Label>
                  <p className="text-sm">{currentStore?.machine_accreditation_number || 'Not Set'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Serial Number</Label>
                  <p className="text-sm">{currentStore?.machine_serial_number || 'Not Set'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Permit Number</Label>
                  <p className="text-sm">{currentStore?.permit_number || 'Not Set'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Valid Until</Label>
                  <p className="text-sm">
                    {currentStore?.valid_until 
                      ? format(new Date(currentStore.valid_until), 'MMM dd, yyyy')
                      : 'Not Set'
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="testing" className="space-y-4">
          <BIRTestingDashboard />
        </TabsContent>

        <TabsContent value="ejournal" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Electronic Journal (E-Journal)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div>
                  <Label htmlFor="date">Select Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-auto"
                  />
                </div>
                <Button onClick={generateEJournal} className="mt-6">
                  <Download className="h-4 w-4 mr-2" />
                  Generate E-Journal
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Generate electronic journal for BIR inspection and audit purposes.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Archive className="h-5 w-5" />
                Audit Trail
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {auditLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{log.event_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {log.log_type} • {format(new Date(log.created_at), 'MMM dd, yyyy HH:mm')}
                      </p>
                    </div>
                    <Badge variant="outline">#{log.sequence_number}</Badge>
                  </div>
                ))}
                {auditLogs.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No audit logs found
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cumulative" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Non-Resettable Cumulative Sales</CardTitle>
            </CardHeader>
            <CardContent>
              {cumulativeSales ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Total Sales</Label>
                      <p className="text-2xl font-bold">
                        ₱{cumulativeSales.grandTotalSales.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <Label>Total Transactions</Label>
                      <p className="text-2xl font-bold">
                        {cumulativeSales.grandTotalTransactions.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <Label>Last Transaction</Label>
                      <p className="text-sm">
                        {cumulativeSales.lastTransactionDate 
                          ? format(new Date(cumulativeSales.lastTransactionDate), 'MMM dd, yyyy HH:mm')
                          : 'None'
                        }
                      </p>
                    </div>
                    <div>
                      <Label>Last Receipt</Label>
                      <p className="text-sm">{cumulativeSales.lastReceiptNumber || 'None'}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No cumulative sales data available
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>BIR Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                BIR settings are managed in Store Settings. 
                <Button variant="link" className="p-0 ml-1" asChild>
                  <a href={`/admin/stores/${currentStore?.id}/settings`}>
                    Go to Store Settings
                  </a>
                </Button>
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}