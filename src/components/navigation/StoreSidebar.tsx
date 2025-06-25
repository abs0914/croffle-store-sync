
import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { useLocation, useNavigate } from "react-router-dom";
import { SidebarMenu } from './SidebarMenu';
import { UserDropdown } from './UserDropdown';
import { StoreSelector } from './StoreSelector';

export function StoreSidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">Store Management</h2>
        <p className="text-sm text-muted-foreground">Navigate your store</p>
      </div>

      {/* Navigation Menu */}
      <div className="flex-1 p-4 space-y-4">
        <SidebarMenu navigate={navigate} isActive={isActive} />
        
        <Separator />
        
        <StoreSelector />
      </div>

      {/* User Profile Section */}
      <div className="border-t p-4">
        <UserDropdown />
      </div>
    </div>
  );
}
