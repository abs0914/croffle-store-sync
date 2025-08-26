
import React, { useState, useEffect, memo, useMemo, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, Store } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth";
import { useStore } from "@/contexts/StoreContext";
import { supabase } from "@/integrations/supabase/client";
import { Store as StoreType } from "@/types/store";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface OptimizedStoreSelectorProps {
  selectedStoreId: string;
  onSelectStore: (storeId: string) => void;
  className?: string;
}

const OptimizedStoreSelector = memo(function OptimizedStoreSelector({
  selectedStoreId,
  onSelectStore,
  className
}: OptimizedStoreSelectorProps) {
  const { user } = useAuth();
  const { stores, currentStore } = useStore();
  const [open, setOpen] = useState(false);
  const [availableStores, setAvailableStores] = useState<StoreType[]>(stores);
  const [loading, setLoading] = useState(true);
  
  // Memoize admin check
  const isAdmin = useMemo(() => {
    return user?.role === 'admin' || user?.role === 'owner';
  }, [user?.role]);
  
  // Check if user has admin role
  useEffect(() => {
    setLoading(false);
  }, [user]);
  
  // Fetch all stores for admin users - memoized
  const fetchAllStores = useCallback(async () => {
    if (isAdmin) {
      try {
        const { data, error } = await supabase
          .from('stores')
          .select('*')
          .order('name');
          
        if (!error && data) {
          console.log('🏪 Available stores for admin:', data.map(s => ({ id: s.id.slice(0, 8), name: s.name })));
          
          // Cast the data to proper Store types
          const typedStores = data.map(store => ({
            ...store,
            ownership_type: (store.ownership_type as 'company_owned' | 'franchisee') || 'company_owned',
            franchisee_contact_info: store.franchisee_contact_info ? 
              (typeof store.franchisee_contact_info === 'object' ? 
                store.franchisee_contact_info as { name?: string; email?: string; phone?: string; address?: string; } : 
                { name: "", email: "", phone: "", address: "" }
              ) : undefined
          })) as StoreType[];
          
          setAvailableStores(typedStores);
        }
      } catch (error) {
        console.error('Error fetching stores:', error);
      }
    } else {
      // Non-admin users only see their assigned stores
      console.log('🏪 Available stores for user:', stores.map(s => ({ id: s.id.slice(0, 8), name: s.name })));
      setAvailableStores(stores);
    }
  }, [isAdmin, stores]);
  
  useEffect(() => {
    if (!loading) {
      fetchAllStores();
    }
  }, [loading, fetchAllStores]);

  // Memoize current store name calculation
  const currentStoreName = useMemo(() => {
    if (selectedStoreId === "all" && isAdmin) {
      return "All Stores";
    }
    
    const store = availableStores.find(s => s.id === selectedStoreId);
    return store ? store.name : "Select Store";
  }, [selectedStoreId, isAdmin, availableStores]);

  const handleStoreSelect = useCallback((storeId: string) => {
    console.log('🎯 Store selected:', { 
      storeId: storeId === 'all' ? 'ALL_STORES' : storeId.slice(0, 8), 
      storeName: storeId === 'all' ? 'All Stores' : availableStores.find(s => s.id === storeId)?.name 
    });
    onSelectStore(storeId);
    setOpen(false);
  }, [onSelectStore, availableStores]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
        >
          <div className="flex items-center gap-2 truncate">
            <Store className="h-4 w-4 shrink-0" />
            <span className="truncate">{currentStoreName}</span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command>
          <CommandInput placeholder="Search store..." />
          <CommandEmpty>No store found.</CommandEmpty>
          <CommandList>
            <CommandGroup>
              {isAdmin && (
                <CommandItem
                  key="all-stores"
                  onSelect={() => handleStoreSelect("all")}
                  className="text-sm"
                >
                  <div className="flex items-center gap-2 w-full">
                    <Store className="h-4 w-4" />
                    <span>All Stores</span>
                  </div>
                  {selectedStoreId === "all" && (
                    <Check className="ml-auto h-4 w-4" />
                  )}
                </CommandItem>
              )}
              
              {availableStores.map((store) => (
                <CommandItem
                  key={store.id}
                  onSelect={() => handleStoreSelect(store.id)}
                  className="text-sm"
                >
                  <div className="flex items-center gap-2 w-full">
                    <Store className="h-4 w-4" />
                    <span>{store.name}</span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {store.id.slice(0, 8)}
                    </span>
                  </div>
                  {selectedStoreId === store.id && (
                    <Check className="ml-auto h-4 w-4" />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
});

export default OptimizedStoreSelector;
