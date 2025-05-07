
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Store } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface StoreSettings {
  id?: string;
  store_id: string;
  receipt_header: string;
  receipt_footer: string;
  tax_percentage: number;
  is_tax_inclusive: boolean;
  currency: string;
  timezone: string;
}

export default function StoreSettings() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [store, setStore] = useState<Store | null>(null);
  const [settings, setSettings] = useState<StoreSettings>({
    store_id: id || '',
    receipt_header: '',
    receipt_footer: '',
    tax_percentage: 12.0,
    is_tax_inclusive: false,
    currency: 'PHP',
    timezone: 'Asia/Manila',
  });
  
  useEffect(() => {
    if (id) {
      fetchStoreAndSettings();
    }
  }, [id]);
  
  const fetchStoreAndSettings = async () => {
    setIsLoading(true);
    try {
      // Fetch store details
      const { data: storeData, error: storeError } = await supabase
        .from('stores')
        .select('*')
        .eq('id', id)
        .single();
      
      if (storeError) throw storeError;
      setStore(storeData);
      
      // Fetch store settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('store_settings')
        .select('*')
        .eq('store_id', id)
        .maybeSingle();
      
      if (settingsError) throw settingsError;
      
      if (settingsData) {
        setSettings(settingsData);
      } else {
        // Create default settings
        setSettings({
          store_id: id || '',
          receipt_header: `${storeData.name}\n${storeData.address}${storeData.phone ? `\nTel: ${storeData.phone}` : ''}`,
          receipt_footer: 'Thank you for your purchase!\nVisit us again soon.',
          tax_percentage: 12.0,
          is_tax_inclusive: false,
          currency: 'PHP',
          timezone: 'Asia/Manila',
        });
      }
    } catch (error: any) {
      console.error('Error fetching store settings:', error);
      toast.error('Failed to load store settings');
      navigate('/stores');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSettings((prev) => ({ ...prev, [name]: value }));
  };
  
  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings((prev) => ({ ...prev, [name]: parseFloat(value) || 0 }));
  };
  
  const handleSwitchChange = (checked: boolean) => {
    setSettings((prev) => ({ ...prev, is_tax_inclusive: checked }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      if (settings.id) {
        // Update existing settings
        const { error } = await supabase
          .from('store_settings')
          .update({
            receipt_header: settings.receipt_header,
            receipt_footer: settings.receipt_footer,
            tax_percentage: settings.tax_percentage,
            is_tax_inclusive: settings.is_tax_inclusive,
            currency: settings.currency,
            timezone: settings.timezone
          })
          .eq('id', settings.id);
          
        if (error) throw error;
      } else {
        // Create new settings
        const { error } = await supabase
          .from('store_settings')
          .insert([settings]);
          
        if (error) throw error;
      }
      
      toast.success('Store settings saved successfully');
      navigate('/stores');
    } catch (error: any) {
      console.error('Error saving store settings:', error);
      toast.error(error.message || 'Failed to save store settings');
    } finally {
      setIsSaving(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full py-12">
        <Loader2 className="h-8 w-8 animate-spin text-croffle-primary" />
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-croffle-primary">Store Settings</h1>
          <p className="text-gray-500">Configure settings for {store?.name}</p>
        </div>
        
        <form onSubmit={handleSubmit}>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-xl">Receipt Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="receipt_header">Receipt Header</Label>
                <Textarea
                  id="receipt_header"
                  name="receipt_header"
                  value={settings.receipt_header}
                  onChange={handleChange}
                  placeholder="Store name and address that appears at the top of receipts"
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="receipt_footer">Receipt Footer</Label>
                <Textarea
                  id="receipt_footer"
                  name="receipt_footer"
                  value={settings.receipt_footer}
                  onChange={handleChange}
                  placeholder="Thank you message that appears at the bottom of receipts"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
          
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-xl">Tax Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tax_percentage">Tax Percentage (%)</Label>
                  <Input
                    id="tax_percentage"
                    name="tax_percentage"
                    type="number"
                    min="0"
                    step="0.01"
                    value={settings.tax_percentage}
                    onChange={handleNumberChange}
                  />
                </div>
                
                <div className="flex items-center space-x-2 h-full">
                  <Switch 
                    checked={settings.is_tax_inclusive} 
                    onCheckedChange={handleSwitchChange}
                    id="is_tax_inclusive"
                  />
                  <Label htmlFor="is_tax_inclusive">Prices include tax</Label>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-xl">Regional Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Input
                    id="currency"
                    name="currency"
                    value={settings.currency}
                    onChange={handleChange}
                    placeholder="PHP"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Input
                    id="timezone"
                    name="timezone"
                    value={settings.timezone}
                    onChange={handleChange}
                    placeholder="Asia/Manila"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/stores")}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="bg-croffle-primary hover:bg-croffle-primary/90"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Settings"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
