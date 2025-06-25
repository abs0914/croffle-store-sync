
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

export function AdminSidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">Admin Panel</h2>
        <p className="text-sm text-muted-foreground">System administration</p>
      </div>

      {/* Navigation Menu */}
      <div className="flex-1 p-4">
        <SidebarMenu navigate={navigate} isActive={isActive} />
      </div>

      {/* User Profile Section */}
      <div className="border-t p-4">
        <UserDropdown />
      </div>
    </div>
  );
}
