
import { supabase } from "@/integrations/supabase/client";
import { LocationPricing, RegionalSupplier, LocationPricingInfo, LocationType } from "@/types/location";
import { toast } from "sonner";

export const fetchLocationPricing = async (): Promise<LocationPricing[]> => {
  try {
    const { data, error } = await supabase
      .from('location_pricing')
      .select(`
        *,
        commissary_inventory(id, name, unit)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(item => ({
      ...item,
      location_type: item.location_type as LocationType
    }));
  } catch (error) {
    console.error('Error fetching location pricing:', error);
    toast.error('Failed to fetch location pricing');
    return [];
  }
};

export const createLocationPricing = async (pricing: Omit<LocationPricing, 'id' | 'created_at' | 'updated_at'>): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('location_pricing')
      .insert(pricing);

    if (error) throw error;
    toast.success('Location pricing created successfully');
    return true;
  } catch (error) {
    console.error('Error creating location pricing:', error);
    toast.error('Failed to create location pricing');
    return false;
  }
};

export const updateLocationPricing = async (id: string, updates: Partial<LocationPricing>): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('location_pricing')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
    toast.success('Location pricing updated successfully');
    return true;
  } catch (error) {
    console.error('Error updating location pricing:', error);
    toast.error('Failed to update location pricing');
    return false;
  }
};

export const getLocationSpecificPricing = async (itemId: string, locationType: LocationType): Promise<LocationPricingInfo | null> => {
  try {
    const { data, error } = await supabase
      .rpc('get_location_pricing', { 
        item_id: itemId, 
        store_location: locationType 
      });

    if (error) throw error;
    return data?.[0] || null;
  } catch (error) {
    console.error('Error fetching location-specific pricing:', error);
    return null;
  }
};

export const fetchRegionalSuppliers = async (): Promise<RegionalSupplier[]> => {
  try {
    const { data, error } = await supabase
      .from('regional_suppliers')
      .select(`
        *,
        supplier:suppliers(id, name, contact_person, phone, email)
      `)
      .order('location_type', { ascending: true });

    if (error) throw error;
    return (data || []).map(item => ({
      ...item,
      location_type: item.location_type as LocationType
    }));
  } catch (error) {
    console.error('Error fetching regional suppliers:', error);
    toast.error('Failed to fetch regional suppliers');
    return [];
  }
};

export const getLocationSuppliers = async (locationType: LocationType) => {
  try {
    const { data, error } = await supabase
      .rpc('get_location_suppliers', { store_location: locationType });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching location suppliers:', error);
    return [];
  }
};

export const createRegionalSupplier = async (regionalSupplier: Omit<RegionalSupplier, 'id' | 'supplier'>): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('regional_suppliers')
      .insert(regionalSupplier);

    if (error) throw error;
    toast.success('Regional supplier assignment created successfully');
    return true;
  } catch (error) {
    console.error('Error creating regional supplier:', error);
    toast.error('Failed to create regional supplier assignment');
    return false;
  }
};
