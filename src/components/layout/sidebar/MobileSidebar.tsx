
import React from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { BrandHeader } from "./BrandHeader";
import { StartShiftButton } from "./StartShiftButton";
import { StoreSelector } from "./StoreSelector";
import { MainMenu } from "./MainMenu";
import { UserProfile } from "./UserProfile";

interface MobileSidebarProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export const MobileSidebar: React.FC<MobileSidebarProps> = ({ 
  isOpen, 
  onOpenChange
}) => {
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-64 p-0 bg-croffle-background">
        <BrandHeader isMobile={true} />
        <StartShiftButton />
        <StoreSelector />
        <div className="flex-1 overflow-auto py-2" data-design-locked="true">
          <MainMenu />
        </div>
        <UserProfile />
      </SheetContent>
    </Sheet>
  );
};
