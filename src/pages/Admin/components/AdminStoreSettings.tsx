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
      is_bir_accredited: false,
      // Enhanced fields
      supplier_name: '',
      supplier_address: '',
      supplier_tin: '',
      accreditation_number: '',
      accreditation_date: '',
      bir_final_permit_number: '',
      is_vat_registered: true,
      non_vat_disclaimer: 'This document is not valid for claim of input tax.',
      validity_statement: 'This receipt/invoice shall be valid for five (5) years from the date of the ATP.'
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
      // Update store BIR fields including enhanced fields
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
          is_bir_accredited: storeSettings.bir_compliance_config.is_bir_accredited,
          // Enhanced BIR fields
          supplier_name: storeSettings.bir_compliance_config.supplier_name,
          supplier_address: storeSettings.bir_compliance_config.supplier_address,
          supplier_tin: storeSettings.bir_compliance_config.supplier_tin,
          accreditation_number: storeSettings.bir_compliance_config.accreditation_number,
          accreditation_date: storeSettings.bir_compliance_config.accreditation_date,
          bir_final_permit_number: storeSettings.bir_compliance_config.bir_final_permit_number,
          is_vat_registered: storeSettings.bir_compliance_config.is_vat_registered,
          non_vat_disclaimer: storeSettings.bir_compliance_config.non_vat_disclaimer,
          validity_statement: storeSettings.bir_compliance_config.validity_statement
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
            
            <div>
              <Label htmlFor="bir_final_permit_number">BIR Final Permit Number</Label>
              <Input
                id="bir_final_permit_number"
                value={storeSettings.bir_compliance_config.bir_final_permit_number || ''}
                onChange={(e) => updateBIRConfig('bir_final_permit_number', e.target.value)}
              />
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Accredited Supplier Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="supplier_name">Supplier Name</Label>
                <Input
                  id="supplier_name"
                  value={storeSettings.bir_compliance_config.supplier_name || ''}
                  onChange={(e) => updateBIRConfig('supplier_name', e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="supplier_tin">Supplier TIN</Label>
                <Input
                  id="supplier_tin"
                  value={storeSettings.bir_compliance_config.supplier_tin || ''}
                  onChange={(e) => updateBIRConfig('supplier_tin', e.target.value)}
                />
              </div>
              
              <div className="md:col-span-2">
                <Label htmlFor="supplier_address">Supplier Address</Label>
                <Textarea
                  id="supplier_address"
                  value={storeSettings.bir_compliance_config.supplier_address || ''}
                  onChange={(e) => updateBIRConfig('supplier_address', e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="accreditation_number">Accreditation Number</Label>
                <Input
                  id="accreditation_number"
                  value={storeSettings.bir_compliance_config.accreditation_number || ''}
                  onChange={(e) => updateBIRConfig('accreditation_number', e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="accreditation_date">Accreditation Date</Label>
                <Input
                  id="accreditation_date"
                  type="date"
                  value={storeSettings.bir_compliance_config.accreditation_date || ''}
                  onChange={(e) => updateBIRConfig('accreditation_date', e.target.value)}
                />
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">VAT Configuration</h3>
            <div className="flex items-center space-x-2">
              <Switch
                id="is_vat_registered"
                checked={storeSettings.bir_compliance_config.is_vat_registered !== false}
                onCheckedChange={(checked) => updateBIRConfig('is_vat_registered', checked)}
              />
              <Label htmlFor="is_vat_registered">VAT Registered</Label>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="non_vat_disclaimer">Non-VAT Disclaimer</Label>
                <Textarea
                  id="non_vat_disclaimer"
                  value={storeSettings.bir_compliance_config.non_vat_disclaimer || ''}
                  onChange={(e) => updateBIRConfig('non_vat_disclaimer', e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="validity_statement">Validity Statement</Label>
                <Textarea
                  id="validity_statement"
                  value={storeSettings.bir_compliance_config.validity_statement || ''}
                  onChange={(e) => updateBIRConfig('validity_statement', e.target.value)}
                />
              </div>
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