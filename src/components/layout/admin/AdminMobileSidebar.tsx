
import React from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { AdminBrandHeader } from "./AdminBrandHeader";
import { AdminMainMenu } from "./AdminMainMenu";
import { AdminUserProfile } from "./AdminUserProfile";

interface AdminMobileSidebarProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export const AdminMobileSidebar: React.FC<AdminMobileSidebarProps> = ({ 
  isOpen, 
  onOpenChange
}) => {
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-64 p-0 bg-gray-900 pt-20">
        <AdminBrandHeader isMobile={true} />
        <div className="flex-1 overflow-auto py-3" data-design-locked="true">
          <AdminMainMenu />
        </div>
        <AdminUserProfile />
      </SheetContent>
    </Sheet>
  );
};
