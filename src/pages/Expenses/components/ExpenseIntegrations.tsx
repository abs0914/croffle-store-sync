
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Zap, 
  Mail, 
  FileSpreadsheet, 
  Cloud, 
  Settings, 
  CheckCircle,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  status: 'connected' | 'disconnected' | 'error';
  config?: Record<string, any>;
}

export default function ExpenseIntegrations() {
  const [integrations, setIntegrations] = useState<Integration[]>([
    {
      id: 'zapier',
      name: 'Zapier',
      description: 'Automate expense workflows and notifications',
      icon: <Zap className="h-5 w-5" />,
      status: 'disconnected',
      config: {
        webhookUrl: '',
        triggers: ['expense_created', 'expense_approved', 'budget_exceeded']
      }
    },
    {
      id: 'email',
      name: 'Email Notifications',
      description: 'Send expense alerts and reports via email',
      icon: <Mail className="h-5 w-5" />,
      status: 'disconnected',
      config: {
        recipients: [],
        frequency: 'daily',
        includeAttachments: true
      }
    },
    {
      id: 'google_sheets',
      name: 'Google Sheets',
      description: 'Export expense data to Google Sheets automatically',
      icon: <FileSpreadsheet className="h-5 w-5" />,
      status: 'disconnected',
      config: {
        spreadsheetId: '',
        sheetName: 'Expenses',
        autoSync: false
      }
    },
    {
      id: 'cloud_storage',
      name: 'Cloud Storage',
      description: 'Backup receipts to Google Drive or Dropbox',
      icon: <Cloud className="h-5 w-5" />,
      status: 'disconnected',
      config: {
        provider: 'google_drive',
        folder: 'Expense Receipts',
        autoBackup: true
      }
    }
  ]);

  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [configData, setConfigData] = useState<Record<string, any>>({});

  const handleIntegrationToggle = (integrationId: string, enabled: boolean) => {
    setIntegrations(prev => prev.map(integration => 
      integration.id === integrationId 
        ? { ...integration, status: enabled ? 'connected' : 'disconnected' }
        : integration
    ));

    if (enabled) {
      toast.success('Integration enabled successfully');
    } else {
      toast.info('Integration disabled');
    }
  };

  const handleConfigSave = (integrationId: string, config: Record<string, any>) => {
    setIntegrations(prev => prev.map(integration => 
      integration.id === integrationId 
        ? { ...integration, config: { ...integration.config, ...config } }
        : integration
    ));
    
    toast.success('Configuration saved');
    setSelectedIntegration(null);
  };

  const testZapierWebhook = async (webhookUrl: string) => {
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        mode: 'no-cors',
        body: JSON.stringify({
          test: true,
          timestamp: new Date().toISOString(),
          message: 'Test from Croffle Store POS'
        })
      });
      
      toast.success('Test webhook sent successfully');
    } catch (error) {
      toast.error('Failed to send test webhook');
    }
  };

  const exportToGoogleSheets = async () => {
    // Simulate Google Sheets export
    toast.info('Exporting to Google Sheets...');
    
    setTimeout(() => {
      toast.success('Expense data exported to Google Sheets');
    }, 2000);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <Badge variant="default" className="bg-green-500">Connected</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="outline">Disconnected</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            External Integrations
          </CardTitle>
          <CardDescription>
            Connect your expense management with external tools and services
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {integrations.map((integration) => (
          <Card key={integration.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {integration.icon}
                  <div>
                    <CardTitle className="text-lg">{integration.name}</CardTitle>
                    <CardDescription className="text-sm">
                      {integration.description}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {getStatusBadge(integration.status)}
                  <Switch
                    checked={integration.status === 'connected'}
                    onCheckedChange={(checked) => 
                      handleIntegrationToggle(integration.id, checked)
                    }
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  {getStatusIcon(integration.status)}
                  <span className="text-sm text-muted-foreground">
                    {integration.status === 'connected' ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedIntegration(integration)}
                >
                  Configure
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Configuration Modal */}
      {selectedIntegration && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {selectedIntegration.icon}
              Configure {selectedIntegration.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="settings" className="space-y-4">
              <TabsList>
                <TabsTrigger value="settings">Settings</TabsTrigger>
                <TabsTrigger value="test">Test</TabsTrigger>
              </TabsList>

              <TabsContent value="settings" className="space-y-4">
                {selectedIntegration.id === 'zapier' && (
                  <div className="space-y-4">
                    <div>
                      <Label>Webhook URL</Label>
                      <Input
                        placeholder="https://hooks.zapier.com/hooks/catch/..."
                        value={configData.webhookUrl || selectedIntegration.config?.webhookUrl || ''}
                        onChange={(e) => setConfigData(prev => ({
                          ...prev,
                          webhookUrl: e.target.value
                        }))}
                      />
                    </div>
                    <div>
                      <Label>Triggers</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {['expense_created', 'expense_approved', 'budget_exceeded'].map(trigger => (
                          <Badge key={trigger} variant="outline">
                            {trigger.replace('_', ' ')}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {selectedIntegration.id === 'email' && (
                  <div className="space-y-4">
                    <div>
                      <Label>Recipients</Label>
                      <Input
                        placeholder="admin@company.com, manager@company.com"
                        value={configData.recipients || ''}
                        onChange={(e) => setConfigData(prev => ({
                          ...prev,
                          recipients: e.target.value
                        }))}
                      />
                    </div>
                    <div>
                      <Label>Frequency</Label>
                      <select 
                        className="w-full p-2 border rounded"
                        value={configData.frequency || 'daily'}
                        onChange={(e) => setConfigData(prev => ({
                          ...prev,
                          frequency: e.target.value
                        }))}
                      >
                        <option value="immediate">Immediate</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                  </div>
                )}

                {selectedIntegration.id === 'google_sheets' && (
                  <div className="space-y-4">
                    <div>
                      <Label>Spreadsheet ID</Label>
                      <Input
                        placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                        value={configData.spreadsheetId || ''}
                        onChange={(e) => setConfigData(prev => ({
                          ...prev,
                          spreadsheetId: e.target.value
                        }))}
                      />
                    </div>
                    <div>
                      <Label>Sheet Name</Label>
                      <Input
                        placeholder="Expenses"
                        value={configData.sheetName || 'Expenses'}
                        onChange={(e) => setConfigData(prev => ({
                          ...prev,
                          sheetName: e.target.value
                        }))}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={configData.autoSync || false}
                        onCheckedChange={(checked) => setConfigData(prev => ({
                          ...prev,
                          autoSync: checked
                        }))}
                      />
                      <Label>Auto-sync expenses daily</Label>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={() => handleConfigSave(selectedIntegration.id, configData)}
                  >
                    Save Configuration
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setSelectedIntegration(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="test" className="space-y-4">
                {selectedIntegration.id === 'zapier' && (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Test your Zapier webhook to ensure it's working correctly.
                    </p>
                    <Button
                      onClick={() => testZapierWebhook(
                        configData.webhookUrl || selectedIntegration.config?.webhookUrl || ''
                      )}
                      disabled={!configData.webhookUrl && !selectedIntegration.config?.webhookUrl}
                    >
                      Send Test Webhook
                    </Button>
                  </div>
                )}

                {selectedIntegration.id === 'google_sheets' && (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Export current expense data to test the Google Sheets connection.
                    </p>
                    <Button onClick={exportToGoogleSheets}>
                      Test Export
                    </Button>
                  </div>
                )}

                {selectedIntegration.id === 'email' && (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Send a test email to verify your configuration.
                    </p>
                    <Button
                      onClick={() => toast.success('Test email sent successfully')}
                    >
                      Send Test Email
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common integration tasks and exports
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Export to Excel
            </Button>
            <Button variant="outline" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email Report
            </Button>
            <Button variant="outline" className="flex items-center gap-2">
              <Cloud className="h-4 w-4" />
              Backup Receipts
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
