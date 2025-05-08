
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Store } from '@/types';

export interface StoreSettings {
  id?: string;
  store_id: string;
  receipt_header: string;
  receipt_footer: string;
  tax_percentage: number;
  is_tax_inclusive: boolean;
  currency: string;
  timezone: string;
}

export const useStoreSettings = (storeId?: string) => {
  const navigate = useNavigate();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [store, setStore] = useState<Store | null>(null);
  const [settings, setSettings] = useState<StoreSettings>({
    store_id: storeId || '',
    receipt_header: '',
    receipt_footer: '',
    tax_percentage: 12.0,
    is_tax_inclusive: false,
    currency: 'PHP',
    timezone: 'Asia/Manila',
  });
  
  useEffect(() => {
    if (storeId) {
      fetchStoreAndSettings();
    }
  }, [storeId]);
  
  const fetchStoreAndSettings = async () => {
    setIsLoading(true);
    try {
      // Fetch store details
      const { data: storeData, error: storeError } = await supabase
        .from('stores')
        .select('*')
        .eq('id', storeId)
        .single();
      
      if (storeError) throw storeError;
      setStore(storeData as Store);
      
      // Fetch store settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('store_settings')
        .select('*')
        .eq('store_id', storeId)
        .maybeSingle();
      
      if (settingsError) throw settingsError;
      
      if (settingsData) {
        setSettings(settingsData);
      } else {
        // Create default settings
        setSettings({
          store_id: storeId || '',
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
  
  return {
    store,
    settings,
    isLoading,
    isSaving,
    handleChange,
    handleNumberChange,
    handleSwitchChange,
    handleSubmit
  };
};
