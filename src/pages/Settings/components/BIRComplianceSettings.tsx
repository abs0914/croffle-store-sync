
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { FileText, AlertTriangle, CheckCircle, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useStore } from "@/contexts/StoreContext";

interface BIRComplianceConfig {
  // Store Information Requirements
  requireTIN: boolean;
  requireBusinessName: boolean;
  requireAddress: boolean;
  requireMachineAccreditation: boolean;
  requireMachineSerial: boolean;
  requirePermitNumber: boolean;
  
  // Receipt Format Requirements
  vatRate: number;
  requireVATBreakdown: boolean;
  requireSeniorPWDBreakdown: boolean;
  requireSequenceNumber: boolean;
  requireTerminalId: boolean;
  requireReceiptFooter: boolean;
  customReceiptFooter: string;
  
  // Transaction Validation Rules
  enforceVATCalculation: boolean;
  enforceDiscountValidation: boolean;
  requireCustomerType: boolean;
  maxDiscountPercentage: number;
  
  // Audit and Compliance
  enableAuditLogs: boolean;
  enableEJournal: boolean;
  enableZReading: boolean;
  enableXReading: boolean;
  autoBackupFrequency: string;
  
  // Printing Requirements
  requireDigitalSignature: boolean;
  enableThermalPrinting: boolean;
  receiptCopies: number;
  fontSizeMultiplier: number;
}

const defaultConfig: BIRComplianceConfig = {
  requireTIN: true,
  requireBusinessName: true,
  requireAddress: true,
  requireMachineAccreditation: true,
  requireMachineSerial: true,
  requirePermitNumber: true,
  vatRate: 12.0,
  requireVATBreakdown: true,
  requireSeniorPWDBreakdown: true,
  requireSequenceNumber: true,
  requireTerminalId: true,
  requireReceiptFooter: true,
  customReceiptFooter: "Thank you for your purchase!\nThis serves as your Official Receipt.",
  enforceVATCalculation: true,
  enforceDiscountValidation: true,
  requireCustomerType: false,
  maxDiscountPercentage: 20,
  enableAuditLogs: true,
  enableEJournal: true,
  enableZReading: true,
  enableXReading: true,
  autoBackupFrequency: 'daily',
  requireDigitalSignature: false,
  enableThermalPrinting: true,
  receiptCopies: 1,
  fontSizeMultiplier: 1.0
};

export function BIRComplianceSettings() {
  const { currentStore } = useStore();
  const [config, setConfig] = useState<BIRComplianceConfig>(defaultConfig);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [complianceStatus, setComplianceStatus] = useState<'compliant' | 'warning' | 'error'>('warning');
  const [storeData, setStoreData] = useState({
    tin: '',
    business_name: '',
    machine_accreditation_number: '',
    machine_serial_number: '',
    permit_number: '',
    date_issued: '',
    valid_until: ''
  });

  useEffect(() => {
    loadBIRConfig();
  }, [currentStore]);

  const loadBIRConfig = async () => {
    if (!currentStore) return;
    
    try {
      const { data, error } = await supabase
        .from('store_settings')
        .select('bir_compliance_config')
        .eq('store_id', currentStore.id)
        .maybeSingle();

      if (error) throw error;

      if (data && data.bir_compliance_config) {
        const configData = data.bir_compliance_config as unknown as BIRComplianceConfig;
        setConfig({ ...defaultConfig, ...configData });
      }
      
      // Load current store data for editing
      setStoreData({
        tin: currentStore.tin || '',
        business_name: currentStore.business_name || '',
        machine_accreditation_number: currentStore.machine_accreditation_number || '',
        machine_serial_number: currentStore.machine_serial_number || '',
        permit_number: currentStore.permit_number || '',
        date_issued: currentStore.date_issued || '',
        valid_until: currentStore.valid_until || ''
      });
      
      checkComplianceStatus();
    } catch (error) {
      console.error('Error loading BIR config:', error);
      toast.error('Failed to load BIR configuration');
    } finally {
      setIsLoading(false);
    }
  };

  const checkComplianceStatus = () => {
    if (!currentStore) return;

    const missingFields = [];
    if (config.requireTIN && !currentStore.tin) missingFields.push('TIN');
    if (config.requireBusinessName && !currentStore.business_name) missingFields.push('Business Name');
    if (config.requireMachineAccreditation && !currentStore.machine_accreditation_number) missingFields.push('Machine Accreditation');
    if (config.requireMachineSerial && !currentStore.machine_serial_number) missingFields.push('Machine Serial');
    if (config.requirePermitNumber && !currentStore.permit_number) missingFields.push('Permit Number');

    if (missingFields.length === 0) {
      setComplianceStatus('compliant');
    } else if (missingFields.length <= 2) {
      setComplianceStatus('warning');
    } else {
      setComplianceStatus('error');
    }
  };

  const handleConfigChange = (field: keyof BIRComplianceConfig, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleStoreDataChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setStoreData(prev => ({ ...prev, [name]: value }));
  };

  const saveBIRConfig = async () => {
    if (!currentStore) return;

    setIsSaving(true);
    try {
      // Save BIR configuration
      const { error: configError } = await supabase
        .from('store_settings')
        .upsert({
          store_id: currentStore.id,
          bir_compliance_config: config as any
        }, {
          onConflict: 'store_id'
        });

      if (configError) throw configError;

      // Save store BIR data
      const { error: storeError } = await supabase
        .from('stores')
        .update({
          tin: storeData.tin,
          business_name: storeData.business_name,
          machine_accreditation_number: storeData.machine_accreditation_number,
          machine_serial_number: storeData.machine_serial_number,
          permit_number: storeData.permit_number,
          date_issued: storeData.date_issued || null,
          valid_until: storeData.valid_until || null
        })
        .eq('id', currentStore.id);

      if (storeError) throw storeError;

      toast.success('BIR compliance configuration saved successfully');
      checkComplianceStatus();
    } catch (error) {
      console.error('Error saving BIR config:', error);
      toast.error('Failed to save BIR configuration');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading BIR configuration...</div>;
  }

  if (!currentStore) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No store selected. Please select a store to configure BIR compliance.</p>
      </div>
    );
  }

  const getStatusIcon = () => {
    switch (complianceStatus) {
      case 'compliant':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'error':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
    }
  };

  const getStatusBadge = () => {
    switch (complianceStatus) {
      case 'compliant':
        return <Badge variant="default" className="bg-green-500">Compliant</Badge>;
      case 'warning':
        return <Badge variant="secondary" className="bg-yellow-500">Needs Attention</Badge>;
      case 'error':
        return <Badge variant="destructive">Non-Compliant</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Compliance Status Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              BIR Compliance Status
            </div>
            {getStatusBadge()}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Configure all BIR compliance requirements for receipts, invoices, and reporting.
          </p>
        </CardContent>
      </Card>

      {/* Store BIR Data Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Store BIR Information
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Configure your store's BIR accreditation details required for POS compliance.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tin">TIN (Taxpayer Identification Number) *</Label>
              <Input
                id="tin"
                name="tin"
                type="text"
                maxLength={12}
                placeholder="123456789000"
                value={storeData.tin}
                onChange={handleStoreDataChange}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="business_name">Business Name *</Label>
              <Input
                id="business_name"
                name="business_name"
                type="text"
                placeholder="Company Name Corp."
                value={storeData.business_name}
                onChange={handleStoreDataChange}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="machine_accreditation_number">Machine Accreditation Number *</Label>
              <Input
                id="machine_accreditation_number"
                name="machine_accreditation_number"
                type="text"
                placeholder="FP012024000001"
                value={storeData.machine_accreditation_number}
                onChange={handleStoreDataChange}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="machine_serial_number">Machine Serial Number *</Label>
              <Input
                id="machine_serial_number"
                name="machine_serial_number"
                type="text"
                placeholder="SN123456789"
                value={storeData.machine_serial_number}
                onChange={handleStoreDataChange}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="permit_number">Permit Number *</Label>
              <Input
                id="permit_number"
                name="permit_number"
                type="text"
                placeholder="ATP123456789"
                value={storeData.permit_number}
                onChange={handleStoreDataChange}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="date_issued">Date Issued</Label>
              <Input
                id="date_issued"
                name="date_issued"
                type="date"
                value={storeData.date_issued}
                onChange={handleStoreDataChange}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="valid_until">Valid Until</Label>
              <Input
                id="valid_until"
                name="valid_until"
                type="date"
                value={storeData.valid_until}
                onChange={handleStoreDataChange}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Store Information Requirements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Store Information Requirements
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Switch
                checked={config.requireTIN}
                onCheckedChange={(checked) => handleConfigChange('requireTIN', checked)}
              />
              <Label>Require TIN (Tax Identification Number)</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                checked={config.requireBusinessName}
                onCheckedChange={(checked) => handleConfigChange('requireBusinessName', checked)}
              />
              <Label>Require Business Name</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                checked={config.requireAddress}
                onCheckedChange={(checked) => handleConfigChange('requireAddress', checked)}
              />
              <Label>Require Business Address</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                checked={config.requireMachineAccreditation}
                onCheckedChange={(checked) => handleConfigChange('requireMachineAccreditation', checked)}
              />
              <Label>Require Machine Accreditation Number</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                checked={config.requireMachineSerial}
                onCheckedChange={(checked) => handleConfigChange('requireMachineSerial', checked)}
              />
              <Label>Require Machine Serial Number</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                checked={config.requirePermitNumber}
                onCheckedChange={(checked) => handleConfigChange('requirePermitNumber', checked)}
              />
              <Label>Require Permit Number</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* VAT and Receipt Requirements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            VAT and Receipt Requirements
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>VAT Rate (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={config.vatRate}
                onChange={(e) => handleConfigChange('vatRate', parseFloat(e.target.value) || 0)}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Maximum Discount Percentage (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={config.maxDiscountPercentage}
                onChange={(e) => handleConfigChange('maxDiscountPercentage', parseInt(e.target.value) || 0)}
              />
            </div>
          </div>
          
          <Separator />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Switch
                checked={config.requireVATBreakdown}
                onCheckedChange={(checked) => handleConfigChange('requireVATBreakdown', checked)}
              />
              <Label>Show VAT Breakdown on Receipts</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                checked={config.requireSeniorPWDBreakdown}
                onCheckedChange={(checked) => handleConfigChange('requireSeniorPWDBreakdown', checked)}
              />
              <Label>Show Senior/PWD Discount Breakdown</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                checked={config.requireSequenceNumber}
                onCheckedChange={(checked) => handleConfigChange('requireSequenceNumber', checked)}
              />
              <Label>Require Receipt Sequence Numbers</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                checked={config.requireTerminalId}
                onCheckedChange={(checked) => handleConfigChange('requireTerminalId', checked)}
              />
              <Label>Show Terminal ID on Receipts</Label>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              checked={config.requireReceiptFooter}
              onCheckedChange={(checked) => handleConfigChange('requireReceiptFooter', checked)}
            />
            <Label>Custom Receipt Footer</Label>
          </div>
          
          {config.requireReceiptFooter && (
            <div className="space-y-2">
              <Label>Receipt Footer Text</Label>
              <Textarea
                value={config.customReceiptFooter}
                onChange={(e) => handleConfigChange('customReceiptFooter', e.target.value)}
                placeholder="Enter custom receipt footer text..."
                rows={3}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transaction Validation */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction Validation Rules</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Switch
                checked={config.enforceVATCalculation}
                onCheckedChange={(checked) => handleConfigChange('enforceVATCalculation', checked)}
              />
              <Label>Enforce VAT Calculation</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                checked={config.enforceDiscountValidation}
                onCheckedChange={(checked) => handleConfigChange('enforceDiscountValidation', checked)}
              />
              <Label>Enforce Discount Validation</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                checked={config.requireCustomerType}
                onCheckedChange={(checked) => handleConfigChange('requireCustomerType', checked)}
              />
              <Label>Require Customer Type for Discounts</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit and Reporting */}
      <Card>
        <CardHeader>
          <CardTitle>Audit and Reporting</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Switch
                checked={config.enableAuditLogs}
                onCheckedChange={(checked) => handleConfigChange('enableAuditLogs', checked)}
              />
              <Label>Enable Audit Logs</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                checked={config.enableEJournal}
                onCheckedChange={(checked) => handleConfigChange('enableEJournal', checked)}
              />
              <Label>Enable E-Journal</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                checked={config.enableZReading}
                onCheckedChange={(checked) => handleConfigChange('enableZReading', checked)}
              />
              <Label>Enable Z-Reading</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                checked={config.enableXReading}
                onCheckedChange={(checked) => handleConfigChange('enableXReading', checked)}
              />
              <Label>Enable X-Reading</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Printing Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Printing Requirements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Number of Receipt Copies</Label>
              <Input
                type="number"
                min="1"
                max="5"
                value={config.receiptCopies}
                onChange={(e) => handleConfigChange('receiptCopies', parseInt(e.target.value) || 1)}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Font Size Multiplier</Label>
              <Input
                type="number"
                min="0.5"
                max="3"
                step="0.1"
                value={config.fontSizeMultiplier}
                onChange={(e) => handleConfigChange('fontSizeMultiplier', parseFloat(e.target.value) || 1)}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Switch
                checked={config.enableThermalPrinting}
                onCheckedChange={(checked) => handleConfigChange('enableThermalPrinting', checked)}
              />
              <Label>Enable Thermal Printing</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                checked={config.requireDigitalSignature}
                onCheckedChange={(checked) => handleConfigChange('requireDigitalSignature', checked)}
              />
              <Label>Require Digital Signature</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={saveBIRConfig} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save BIR Configuration'}
        </Button>
      </div>
    </div>
  );
}
