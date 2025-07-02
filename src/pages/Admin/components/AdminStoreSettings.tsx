import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Save, Settings } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Store } from '@/types';

export default function AdminStoreSettings() {
  const navigate = useNavigate();
  const { id } = useParams();
  
  const [store, setStore] = useState<Partial<Store>>({});
  const [storeSettings, setStoreSettings] = useState({
    bir_compliance_config: {
      tin: '',
      business_name: '',
      machine_accreditation_number: '',
      machine_serial_number: '',
      pos_version: '',
      permit_number: '',
      date_issued: '',
      valid_until: '',
      is_bir_accredited: false
    }
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (id) {
      loadStoreAndSettings();
    }
  }, [id]);

  const loadStoreAndSettings = async () => {
    if (!id) return;
    
    setIsLoading(true);
    try {
      // Load store data
      const { data: storeData, error: storeError } = await supabase
        .from('stores')
        .select('*')
        .eq('id', id)
        .single();
      
      if (storeError) throw storeError;
      setStore(storeData as Partial<Store>);

      // Load store settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('store_settings')
        .select('*')
        .eq('store_id', id)
        .single();
      
      if (settingsData && settingsData.bir_compliance_config) {
        setStoreSettings({
          bir_compliance_config: settingsData.bir_compliance_config as any
        });
      }
    } catch (error) {
      console.error('Error loading store settings:', error);
      toast.error('Failed to load store settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!id) return;
    
    setIsLoading(true);
    try {
      // Update store BIR fields
      const { error: storeError } = await supabase
        .from('stores')
        .update({
          tin: storeSettings.bir_compliance_config.tin,
          business_name: storeSettings.bir_compliance_config.business_name,
          machine_accreditation_number: storeSettings.bir_compliance_config.machine_accreditation_number,
          machine_serial_number: storeSettings.bir_compliance_config.machine_serial_number,
          pos_version: storeSettings.bir_compliance_config.pos_version,
          permit_number: storeSettings.bir_compliance_config.permit_number,
          date_issued: storeSettings.bir_compliance_config.date_issued,
          valid_until: storeSettings.bir_compliance_config.valid_until,
          is_bir_accredited: storeSettings.bir_compliance_config.is_bir_accredited
        })
        .eq('id', id);
      
      if (storeError) throw storeError;

      // Upsert store settings
      const { error: settingsError } = await supabase
        .from('store_settings')
        .upsert({
          store_id: id,
          bir_compliance_config: storeSettings.bir_compliance_config
        });
      
      if (settingsError) throw settingsError;
      
      toast.success('Store settings updated successfully');
    } catch (error) {
      console.error('Error saving store settings:', error);
      toast.error('Failed to save store settings');
    } finally {
      setIsLoading(false);
    }
  };

  const updateBIRConfig = (field: string, value: any) => {
    setStoreSettings(prev => ({
      ...prev,
      bir_compliance_config: {
        ...prev.bir_compliance_config,
        [field]: value
      }
    }));
  };

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => navigate('/admin/stores')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Stores
        </Button>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="h-6 w-6" />
          Store Settings: {store.name}
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>BIR Compliance Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="tin">TIN</Label>
              <Input
                id="tin"
                value={storeSettings.bir_compliance_config.tin || ''}
                onChange={(e) => updateBIRConfig('tin', e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="business_name">Business Name</Label>
              <Input
                id="business_name"
                value={storeSettings.bir_compliance_config.business_name || ''}
                onChange={(e) => updateBIRConfig('business_name', e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="machine_accreditation_number">Machine Accreditation Number</Label>
              <Input
                id="machine_accreditation_number"
                value={storeSettings.bir_compliance_config.machine_accreditation_number || ''}
                onChange={(e) => updateBIRConfig('machine_accreditation_number', e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="machine_serial_number">Machine Serial Number</Label>
              <Input
                id="machine_serial_number"
                value={storeSettings.bir_compliance_config.machine_serial_number || ''}
                onChange={(e) => updateBIRConfig('machine_serial_number', e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="permit_number">Permit Number</Label>
              <Input
                id="permit_number"
                value={storeSettings.bir_compliance_config.permit_number || ''}
                onChange={(e) => updateBIRConfig('permit_number', e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="pos_version">POS Version</Label>
              <Input
                id="pos_version"
                value={storeSettings.bir_compliance_config.pos_version || ''}
                onChange={(e) => updateBIRConfig('pos_version', e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="date_issued">Date Issued</Label>
              <Input
                id="date_issued"
                type="date"
                value={storeSettings.bir_compliance_config.date_issued || ''}
                onChange={(e) => updateBIRConfig('date_issued', e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="valid_until">Valid Until</Label>
              <Input
                id="valid_until"
                type="date"
                value={storeSettings.bir_compliance_config.valid_until || ''}
                onChange={(e) => updateBIRConfig('valid_until', e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="is_bir_accredited"
              checked={storeSettings.bir_compliance_config.is_bir_accredited || false}
              onCheckedChange={(checked) => updateBIRConfig('is_bir_accredited', checked)}
            />
            <Label htmlFor="is_bir_accredited">BIR Accredited</Label>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => navigate('/admin/stores')}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isLoading}>
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}