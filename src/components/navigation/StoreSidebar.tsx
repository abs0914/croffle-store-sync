
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
    <Sheet>
      <SheetTrigger asChild>
        <button className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-accent-foreground bg-muted hover:bg-muted-foreground hover:text-accent-foreground h-10 px-4 py-2 w-full">
          Menu
        </button>
      </SheetTrigger>
      <SheetContent className="w-full sm:w-[280px]">
        <SheetHeader>
          <SheetTitle>Menu</SheetTitle>
          <SheetDescription>
            Navigate your store
          </SheetDescription>
        </SheetHeader>
        <Separator className="my-4" />

        <SidebarMenu navigate={navigate} isActive={isActive} />

        <Separator className="my-4" />

        <UserDropdown />

        <Separator className="my-4" />

        <StoreSelector />
      </SheetContent>
    </Sheet>
  );
}
