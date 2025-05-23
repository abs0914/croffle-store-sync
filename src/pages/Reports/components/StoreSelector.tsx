
import { useState, useEffect } from 'react';
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

export function StoreSelector({
  selectedStoreId,
  onSelectStore,
  className
}: {
  selectedStoreId: string;
  onSelectStore: (storeId: string) => void;
  className?: string;
}) {
  const { user } = useAuth();
  const { stores, currentStore } = useStore();
  const [open, setOpen] = useState(false);
  const [availableStores, setAvailableStores] = useState<StoreType[]>(stores);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Check if user has admin role
  useEffect(() => {
    setIsAdmin(user?.role === 'admin' || user?.role === 'owner');
    setLoading(false);
  }, [user]);
  
  // Fetch all stores for admin users
  useEffect(() => {
    const fetchAllStores = async () => {
      if (isAdmin) {
        try {
          const { data, error } = await supabase
            .from('stores')
            .select('*')
            .order('name');
            
          if (!error && data) {
            setAvailableStores(data);
          }
        } catch (error) {
          console.error('Error fetching stores:', error);
        }
      } else {
        // Non-admin users only see their assigned stores
        setAvailableStores(stores);
      }
    };
    
    if (!loading) {
      fetchAllStores();
    }
  }, [isAdmin, loading, stores]);

  // Get the current store name
  const getCurrentStoreName = () => {
    if (selectedStoreId === "all" && isAdmin) {
      return "All Stores";
    }
    
    const store = availableStores.find(s => s.id === selectedStoreId);
    return store ? store.name : "Select Store";
  };

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
            <span className="truncate">{getCurrentStoreName()}</span>
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
                  onSelect={() => {
                    onSelectStore("all");
                    setOpen(false);
                  }}
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
                  onSelect={() => {
                    onSelectStore(store.id);
                    setOpen(false);
                  }}
                  className="text-sm"
                >
                  <div className="flex items-center gap-2 w-full">
                    <Store className="h-4 w-4" />
                    <span>{store.name}</span>
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
}
