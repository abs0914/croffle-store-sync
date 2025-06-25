
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Store } from '@/types';
import { toast } from 'sonner';

export const useStoreSettings = (id?: string) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    vat_rate: 0,
    currency: 'PHP',
    receipt_header: '',
    receipt_footer: '',
    tax_percentage: 0,
    is_tax_inclusive: false,
    timezone: 'Asia/Manila'
  });

  const { data: store, isLoading, error } = useQuery({
    queryKey: ['store', id],
    queryFn: async () => {
      if (!id) throw new Error('Store ID is required');
      
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      // Transform the data to match the Store interface
      return {
        ...data,
        address: data.address || '',
        location: data.address || `${data.city || ''}, ${data.country || ''}`.trim() || 'Unknown Location'
      } as Store;
    },
    enabled: !!id
  });

  useEffect(() => {
    if (store) {
      setFormData({
        vat_rate: store.vat_rate || 0,
        currency: store.currency || 'PHP',
        receipt_header: store.receipt_header || '',
        receipt_footer: store.receipt_footer || '',
        tax_percentage: store.vat_rate || 0,
        is_tax_inclusive: false,
        timezone: 'Asia/Manila'
      });
    }
  }, [store]);

  const updateStoreMutation = useMutation({
    mutationFn: async (updates: Partial<Store>) => {
      if (!id) throw new Error('Store ID is required');
      
      const { error } = await supabase
        .from('stores')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success('Store settings updated successfully!');
      await queryClient.invalidateQueries({ queryKey: ['store', id] });
    },
    onError: (error: any) => {
      toast.error(`Failed to update store settings: ${error.message}`);
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateStoreMutation.mutateAsync({
        vat_rate: formData.vat_rate,
        currency: formData.currency,
        receipt_header: formData.receipt_header,
        receipt_footer: formData.receipt_footer
      });
    } catch (error) {
      console.error("Error updating store settings:", error);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNumberChange = (field: string, value: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSwitchChange = (field: string, value: boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return {
    store,
    isLoading,
    error,
    formData,
    setFormData,
    handleSubmit,
    isUpdating: updateStoreMutation.isPending,
    settings: formData,
    isSaving: updateStoreMutation.isPending,
    handleChange,
    handleNumberChange,
    handleSwitchChange
  };
};
