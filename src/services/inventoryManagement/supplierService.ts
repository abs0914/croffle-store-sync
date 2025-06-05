
import { supabase } from "@/integrations/supabase/client";
import { Supplier } from "@/types/inventoryManagement";
import { toast } from "sonner";

export const fetchSuppliers = async (): Promise<Supplier[]> => {
  try {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    toast.error('Failed to fetch suppliers');
    return [];
  }
};

export const createSupplier = async (supplier: Omit<Supplier, 'id' | 'created_at' | 'updated_at'>): Promise<Supplier | null> => {
  try {
    const { data, error } = await supabase
      .from('suppliers')
      .insert(supplier)
      .select()
      .single();

    if (error) throw error;

    toast.success('Supplier created successfully');
    return data;
  } catch (error) {
    console.error('Error creating supplier:', error);
    toast.error('Failed to create supplier');
    return null;
  }
};

export const updateSupplier = async (id: string, updates: Partial<Supplier>): Promise<Supplier | null> => {
  try {
    const { data, error } = await supabase
      .from('suppliers')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    toast.success('Supplier updated successfully');
    return data;
  } catch (error) {
    console.error('Error updating supplier:', error);
    toast.error('Failed to update supplier');
    return null;
  }
};

export const deleteSupplier = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('suppliers')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw error;

    toast.success('Supplier deleted successfully');
    return true;
  } catch (error) {
    console.error('Error deleting supplier:', error);
    toast.error('Failed to delete supplier');
    return false;
  }
};
