
import React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Store } from "lucide-react";
import { useStore } from "@/contexts/StoreContext";
import { useAuth } from "@/contexts/AuthContext";

export const StoreSelector: React.FC = () => {
  const { currentStore, stores, setCurrentStore } = useStore();
  const { user } = useAuth();
  
  // Hide store selector for cashier users
  if (user?.role === 'cashier') {
    return null;
  }
  
  return (
    <div className="px-3 py-2 border-b">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full gap-2 justify-start"
          >
            <Store className="h-4 w-4" />
            <span className="truncate">
              {currentStore ? currentStore.name : "Select Store"}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Switch Store</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {stores.map((store) => (
            <DropdownMenuItem
              key={store.id}
              onClick={() => setCurrentStore(store)}
              className="flex items-center gap-2"
            >
              {store.logo_url && (
                <img 
                  src={store.logo_url} 
                  alt={store.name} 
                  className="h-5 w-5 object-cover rounded"
                />
              )}
              {store.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
