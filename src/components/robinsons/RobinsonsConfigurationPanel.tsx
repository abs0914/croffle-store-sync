import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, Settings } from "lucide-react";

interface RobinsonsConfigurationPanelProps {
  storeId: string;
}

export function RobinsonsConfigurationPanel({ storeId }: RobinsonsConfigurationPanelProps) {
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState({
    robinsons_enabled: false,
    robinsons_tenant_id: '',
    robinsons_sftp_host: '',
    robinsons_sftp_port: 22,
    robinsons_sftp_username: '',
    robinsons_store_type: 'regular',
    robinsons_eod_counter: 0,
  });

  useEffect(() => {
    fetchConfig();
  }, [storeId]);

  const fetchConfig = async () => {
    const { data, error } = await supabase
      .from('stores')
      .select('robinsons_enabled, robinsons_tenant_id, robinsons_sftp_host, robinsons_sftp_port, robinsons_sftp_username, robinsons_store_type, robinsons_eod_counter')
      .eq('id', storeId)
      .single();

    if (error) {
      console.error('Error fetching config:', error);
      return;
    }

    if (data) {
      setConfig({
        robinsons_enabled: data.robinsons_enabled || false,
        robinsons_tenant_id: data.robinsons_tenant_id || '',
        robinsons_sftp_host: data.robinsons_sftp_host || '',
        robinsons_sftp_port: data.robinsons_sftp_port || 22,
        robinsons_sftp_username: data.robinsons_sftp_username || '',
        robinsons_store_type: data.robinsons_store_type || 'regular',
        robinsons_eod_counter: data.robinsons_eod_counter || 0,
      });
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('stores')
        .update(config)
        .eq('id', storeId);

      if (error) throw error;

      toast.success('Robinsons configuration saved successfully');
    } catch (error: any) {
      console.error('Error saving config:', error);
      toast.error('Failed to save configuration: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Robinsons Accreditation Configuration
        </CardTitle>
        <CardDescription>
          Configure Robinsons Land Corporation data transmission settings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable/Disable */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Enable Robinsons Transmission</Label>
            <p className="text-sm text-muted-foreground">
              Activate automatic data transmission to Robinsons servers
            </p>
          </div>
          <Switch
            checked={config.robinsons_enabled}
            onCheckedChange={(checked) => setConfig({ ...config, robinsons_enabled: checked })}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Tenant ID */}
          <div className="space-y-2">
            <Label htmlFor="tenant-id">Tenant ID *</Label>
            <Input
              id="tenant-id"
              placeholder="0100000001"
              maxLength={10}
              value={config.robinsons_tenant_id}
              onChange={(e) => setConfig({ ...config, robinsons_tenant_id: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              10-digit ID provided by Robinsons Land Corporation
            </p>
          </div>

          {/* Store Type */}
          <div className="space-y-2">
            <Label htmlFor="store-type">Store Type</Label>
            <Select
              value={config.robinsons_store_type}
              onValueChange={(value) => setConfig({ ...config, robinsons_store_type: value })}
            >
              <SelectTrigger id="store-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="regular">Regular Store (EOD at 4:00 AM)</SelectItem>
                <SelectItem value="24_7">24/7 Store (EOD at 11:59 PM)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Determines automatic EOD trigger timing
            </p>
          </div>

          {/* SFTP Host */}
          <div className="space-y-2">
            <Label htmlFor="sftp-host">SFTP Host</Label>
            <Input
              id="sftp-host"
              placeholder="sftp.robinsonsmalls.com"
              value={config.robinsons_sftp_host}
              onChange={(e) => setConfig({ ...config, robinsons_sftp_host: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Robinsons SFTP server hostname
            </p>
          </div>

          {/* SFTP Port */}
          <div className="space-y-2">
            <Label htmlFor="sftp-port">SFTP Port</Label>
            <Input
              id="sftp-port"
              type="number"
              placeholder="22"
              value={config.robinsons_sftp_port}
              onChange={(e) => setConfig({ ...config, robinsons_sftp_port: parseInt(e.target.value) || 22 })}
            />
            <p className="text-xs text-muted-foreground">
              Usually 22 for SFTP
            </p>
          </div>

          {/* SFTP Username */}
          <div className="space-y-2">
            <Label htmlFor="sftp-username">SFTP Username</Label>
            <Input
              id="sftp-username"
              placeholder="tenant_username"
              value={config.robinsons_sftp_username}
              onChange={(e) => setConfig({ ...config, robinsons_sftp_username: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Provided by Robinsons IT
            </p>
          </div>

          {/* EOD Counter (Read-only) */}
          <div className="space-y-2">
            <Label htmlFor="eod-counter">Current EOD Counter</Label>
            <Input
              id="eod-counter"
              type="number"
              value={config.robinsons_eod_counter}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              Increments with each successful transmission
            </p>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Saving...' : 'Save Configuration'}
          </Button>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <strong>Note:</strong> SFTP password must be configured separately as a secret.
            Contact your system administrator to add the ROBINSONS_SFTP_PASSWORD secret.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

// Missing import
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
