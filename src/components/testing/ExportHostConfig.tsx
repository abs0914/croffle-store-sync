
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, XCircle, Download, Server, Database, Clock, FileText, AlertTriangle } from 'lucide-react';
import { ExportHostConfig, PostgreSQLConnectionConfig, SMExportHostService } from '@/services/exports/smExportHostService';
import { useToast } from '@/hooks/use-toast';

interface ExportHostConfigProps {
  storeId: string;
  storeName: string;
}

export const ExportHostConfiguration: React.FC<ExportHostConfigProps> = ({ 
  storeId, 
  storeName 
}) => {
  const [exportHostConfig, setExportHostConfig] = useState<ExportHostConfig>({
    hostType: 'windows',
    hostIp: '',
    hostUser: '',
    hostPassword: '',
    siaFolderPath: 'C:\\SIA',
    postgresqlClientPath: 'C:\\Program Files\\PostgreSQL\\16\\bin\\psql.exe',
    mosaicSchedulerPath: '',
    enabled: false
  });

  const [connectionConfig, setConnectionConfig] = useState<PostgreSQLConnectionConfig>({
    host: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 5432,
    database: 'postgres',
    username: '',
    password: '',
    ssl: true
  });

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [deploymentPackage, setDeploymentPackage] = useState<any>(null);
  const { toast } = useToast();

  const exportHostService = new SMExportHostService();

  const testConnection = async () => {
    setTesting(true);
    try {
      // Test export host connection
      const hostTest = await exportHostService.testExportHostConnection(exportHostConfig);
      
      // Test PostgreSQL connection string generation
      const connectionString = exportHostService.generateConnectionString(connectionConfig);
      
      setTestResult({
        hostConnection: hostTest,
        connectionString,
        timestamp: new Date().toISOString()
      });

      toast({
        title: hostTest.success ? "Connection Test Passed" : "Connection Test Failed",
        description: hostTest.message,
        variant: hostTest.success ? "default" : "destructive"
      });
    } catch (error) {
      console.error('Connection test error:', error);
      toast({
        title: "Test Error",
        description: "Failed to run connection test",
        variant: "destructive"
      });
    } finally {
      setTesting(false);
    }
  };

  const generateDeploymentPackage = () => {
    try {
      const deploymentPkg = exportHostService.generateDeploymentPackage(
        exportHostConfig,
        connectionConfig,
        storeId,
        storeName
      );
      
      setDeploymentPackage(deploymentPkg);
      
      toast({
        title: "Deployment Package Generated",
        description: `Generated ${deploymentPkg.scripts.length} scripts and ${deploymentPkg.schedulerConfigs.length} configurations`,
        variant: "default"
      });
    } catch (error) {
      console.error('Package generation error:', error);
      toast({
        title: "Generation Error",
        description: "Failed to generate deployment package",
        variant: "destructive"
      });
    }
  };

  const downloadFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Export Host Configuration
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Configure the back-office server that will run the export scripts and coordinate with Mosaic Scheduler
          </p>
        </CardHeader>
        
        <CardContent>
          <Tabs defaultValue="host" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="host">Export Host</TabsTrigger>
              <TabsTrigger value="database">Database Connection</TabsTrigger>
              <TabsTrigger value="deployment">Deployment</TabsTrigger>
            </TabsList>

            <TabsContent value="host" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="hostType">Host Type</Label>
                  <Select 
                    value={exportHostConfig.hostType} 
                    onValueChange={(value: 'windows' | 'linux') => 
                      setExportHostConfig(prev => ({ 
                        ...prev, 
                        hostType: value,
                        siaFolderPath: value === 'windows' ? 'C:\\SIA' : '/opt/sia',
                        postgresqlClientPath: value === 'windows' 
                          ? 'C:\\Program Files\\PostgreSQL\\16\\bin\\psql.exe'
                          : '/usr/bin/psql'
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="windows">Windows Server</SelectItem>
                      <SelectItem value="linux">Linux Server</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="hostIp">Host IP Address</Label>
                  <Input
                    id="hostIp"
                    value={exportHostConfig.hostIp}
                    onChange={(e) => setExportHostConfig(prev => ({ ...prev, hostIp: e.target.value }))}
                    placeholder="192.168.1.100"
                  />
                </div>

                <div>
                  <Label htmlFor="hostUser">Username</Label>
                  <Input
                    id="hostUser"
                    value={exportHostConfig.hostUser}
                    onChange={(e) => setExportHostConfig(prev => ({ ...prev, hostUser: e.target.value }))}
                    placeholder="administrator"
                  />
                </div>

                <div>
                  <Label htmlFor="hostPassword">Password</Label>
                  <Input
                    id="hostPassword"
                    type="password"
                    value={exportHostConfig.hostPassword}
                    onChange={(e) => setExportHostConfig(prev => ({ ...prev, hostPassword: e.target.value }))}
                    placeholder="••••••••"
                  />
                </div>

                <div>
                  <Label htmlFor="siaPath">SIA Folder Path</Label>
                  <Input
                    id="siaPath"
                    value={exportHostConfig.siaFolderPath}
                    onChange={(e) => setExportHostConfig(prev => ({ ...prev, siaFolderPath: e.target.value }))}
                    placeholder={exportHostConfig.hostType === 'windows' ? 'C:\\SIA' : '/opt/sia'}
                  />
                </div>

                <div>
                  <Label htmlFor="postgresqlPath">PostgreSQL Client Path</Label>
                  <Input
                    id="postgresqlPath"
                    value={exportHostConfig.postgresqlClientPath}
                    onChange={(e) => setExportHostConfig(prev => ({ ...prev, postgresqlClientPath: e.target.value }))}
                    placeholder={exportHostConfig.hostType === 'windows' 
                      ? 'C:\\Program Files\\PostgreSQL\\16\\bin\\psql.exe'
                      : '/usr/bin/psql'
                    }
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="mosaicPath">Mosaic Scheduler Path (Optional)</Label>
                  <Input
                    id="mosaicPath"
                    value={exportHostConfig.mosaicSchedulerPath}
                    onChange={(e) => setExportHostConfig(prev => ({ ...prev, mosaicSchedulerPath: e.target.value }))}
                    placeholder="C:\\Program Files\\Mosaic\\Scheduler"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="database" className="space-y-4">
              <Alert>
                <Database className="h-4 w-4" />
                <AlertDescription>
                  Configure PostgreSQL connection to your Supabase database for external access
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dbHost">Database Host</Label>
                  <Input
                    id="dbHost"
                    value={connectionConfig.host}
                    onChange={(e) => setConnectionConfig(prev => ({ ...prev, host: e.target.value }))}
                    placeholder="your-project.supabase.co"
                  />
                </div>

                <div>
                  <Label htmlFor="dbPort">Port</Label>
                  <Input
                    id="dbPort"
                    type="number"
                    value={connectionConfig.port}
                    onChange={(e) => setConnectionConfig(prev => ({ ...prev, port: parseInt(e.target.value) }))}
                    placeholder="5432"
                  />
                </div>

                <div>
                  <Label htmlFor="dbName">Database Name</Label>
                  <Input
                    id="dbName"
                    value={connectionConfig.database}
                    onChange={(e) => setConnectionConfig(prev => ({ ...prev, database: e.target.value }))}
                    placeholder="postgres"
                  />
                </div>

                <div>
                  <Label htmlFor="dbUser">Username</Label>
                  <Input
                    id="dbUser"
                    value={connectionConfig.username}
                    onChange={(e) => setConnectionConfig(prev => ({ ...prev, username: e.target.value }))}
                    placeholder="postgres"
                  />
                </div>

                <div>
                  <Label htmlFor="dbPassword">Password</Label>
                  <Input
                    id="dbPassword"
                    type="password"
                    value={connectionConfig.password}
                    onChange={(e) => setConnectionConfig(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="••••••••"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="ssl"
                    checked={connectionConfig.ssl}
                    onChange={(e) => setConnectionConfig(prev => ({ ...prev, ssl: e.target.checked }))}
                  />
                  <Label htmlFor="ssl">Enable SSL</Label>
                </div>
              </div>

              {connectionConfig.username && connectionConfig.password && (
                <div className="p-3 bg-muted rounded-md">
                  <Label className="text-sm font-medium">Generated Connection String:</Label>
                  <code className="block mt-1 text-xs break-all">
                    {exportHostService.generateConnectionString(connectionConfig)}
                  </code>
                </div>
              )}
            </TabsContent>

            <TabsContent value="deployment" className="space-y-4">
              <div className="flex gap-2">
                <Button onClick={testConnection} disabled={testing} variant="outline">
                  <Server className="h-4 w-4 mr-2" />
                  {testing ? "Testing..." : "Test Connection"}
                </Button>
                
                <Button onClick={generateDeploymentPackage}>
                  <FileText className="h-4 w-4 mr-2" />
                  Generate Deployment Package
                </Button>
              </div>

              {testResult && (
                <div className="space-y-4">
                  <Alert variant={testResult.hostConnection.success ? "default" : "destructive"}>
                    <div className="flex items-center gap-2">
                      {testResult.hostConnection.success ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <AlertDescription>
                        <strong>Connection Test:</strong> {testResult.hostConnection.message}
                      </AlertDescription>
                    </div>
                  </Alert>

                  {testResult.hostConnection.details && (
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <strong>Host Type:</strong> {testResult.hostConnection.details.hostType}
                      </div>
                      <div>
                        <strong>SIA Path:</strong> {testResult.hostConnection.details.siaPath}
                      </div>
                      <div>
                        <strong>PostgreSQL:</strong> {testResult.hostConnection.details.postgresqlClient}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {deploymentPackage && (
                <div className="space-y-4">
                  <Alert>
                    <FileText className="h-4 w-4" />
                    <AlertDescription>
                      Deployment package generated with {deploymentPackage.scripts.length} scripts 
                      and {deploymentPackage.schedulerConfigs.length} scheduler configurations
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-3">
                    <h4 className="font-medium">Export Scripts:</h4>
                    {deploymentPackage.scripts.map((script: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-md">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          <span className="font-mono text-sm">{script.name}</span>
                          <Badge variant="outline">{script.type}</Badge>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => downloadFile(script.name, script.content)}
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Download
                        </Button>
                      </div>
                    ))}

                    <h4 className="font-medium">Scheduler Configurations:</h4>
                    {deploymentPackage.schedulerConfigs.map((config: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-md">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span className="font-mono text-sm">{config.name}</span>
                          <Badge variant="outline">{config.type}</Badge>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => downloadFile(config.name, config.content)}
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Download
                        </Button>
                      </div>
                    ))}

                    <div className="p-4 bg-muted rounded-md">
                      <h4 className="font-medium mb-2">Deployment Instructions:</h4>
                      <ol className="text-sm space-y-1 list-decimal list-inside">
                        {deploymentPackage.instructions.map((instruction: string, index: number) => (
                          <li key={index}>{instruction}</li>
                        ))}
                      </ol>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Important:</strong> Ensure the export scripts run <em>before</em> Mosaic Scheduler's 
          file pickup time. Configure the Windows Task Scheduler or Linux cron to run at least 
          5-10 minutes before Mosaic's hourly email/SFTP schedule.
        </AlertDescription>
      </Alert>
    </div>
  );
};
