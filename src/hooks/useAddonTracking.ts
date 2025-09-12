import { useState, useCallback } from 'react';

export interface AddonMetadata {
  selectedAddons: Array<{
    id: string;
    name: string;
    group: string;
    price?: number;
  }>;
  totalAddonPrice: number;
  addonGroups: Record<string, string[]>;
}

export interface UseAddonTrackingProps {
  productId: string;
  productName: string;
}

export const useAddonTracking = ({ productId, productName }: UseAddonTrackingProps) => {
  const [addonMetadata, setAddonMetadata] = useState<AddonMetadata>({
    selectedAddons: [],
    totalAddonPrice: 0,
    addonGroups: {}
  });

  const addAddon = useCallback((addon: {
    id: string;
    name: string;
    group: string;
    price?: number;
  }) => {
    setAddonMetadata(prev => {
      const newSelectedAddons = [...prev.selectedAddons, addon];
      const totalAddonPrice = newSelectedAddons.reduce((sum, addon) => sum + (addon.price || 0), 0);
      
      const addonGroups = newSelectedAddons.reduce((groups, addon) => {
        if (!groups[addon.group]) groups[addon.group] = [];
        groups[addon.group].push(addon.id);
        return groups;
      }, {} as Record<string, string[]>);

      return {
        selectedAddons: newSelectedAddons,
        totalAddonPrice,
        addonGroups
      };
    });
  }, []);

  const removeAddon = useCallback((addonId: string) => {
    setAddonMetadata(prev => {
      const newSelectedAddons = prev.selectedAddons.filter(addon => addon.id !== addonId);
      const totalAddonPrice = newSelectedAddons.reduce((sum, addon) => sum + (addon.price || 0), 0);
      
      const addonGroups = newSelectedAddons.reduce((groups, addon) => {
        if (!groups[addon.group]) groups[addon.group] = [];
        groups[addon.group].push(addon.id);
        return groups;
      }, {} as Record<string, string[]>);

      return {
        selectedAddons: newSelectedAddons,
        totalAddonPrice,
        addonGroups
      };
    });
  }, []);

  const updateAddonSelection = useCallback((selectedIds: string[], availableAddons: Array<{
    id: string;
    name: string;
    group: string;
    price?: number;
  }>) => {
    const newSelectedAddons = availableAddons.filter(addon => selectedIds.includes(addon.id));
    const totalAddonPrice = newSelectedAddons.reduce((sum, addon) => sum + (addon.price || 0), 0);
    
    const addonGroups = newSelectedAddons.reduce((groups, addon) => {
      if (!groups[addon.group]) groups[addon.group] = [];
      groups[addon.group].push(addon.id);
      return groups;
    }, {} as Record<string, string[]>);

    setAddonMetadata({
      selectedAddons: newSelectedAddons,
      totalAddonPrice,
      addonGroups
    });
  }, []);

  const clearAddons = useCallback(() => {
    setAddonMetadata({
      selectedAddons: [],
      totalAddonPrice: 0,
      addonGroups: {}
    });
  }, []);

  const getFormattedMetadata = useCallback(() => {
    return {
      selected_addons: addonMetadata.selectedAddons.map(addon => ({
        id: addon.id,
        name: addon.name,
        group: addon.group,
        price: addon.price || 0
      })),
      addon_metadata: {
        productId,
        productName,
        totalAddonPrice: addonMetadata.totalAddonPrice,
        addonGroups: addonMetadata.addonGroups,
        selectionTimestamp: new Date().toISOString()
      }
    };
  }, [addonMetadata, productId, productName]);

  return {
    addonMetadata,
    addAddon,
    removeAddon,
    updateAddonSelection,
    clearAddons,
    getFormattedMetadata,
    hasAddons: addonMetadata.selectedAddons.length > 0
  };
};