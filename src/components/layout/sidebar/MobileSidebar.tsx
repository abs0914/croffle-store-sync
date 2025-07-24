
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
      <SheetContent side="left" className="w-80 max-w-[90vw] p-0 bg-croffle-background pt-20 overflow-x-hidden">{/* Force wider sidebar */}
        <BrandHeader isMobile={true} />
        <StartShiftButton />
        <StoreSelector />
        <div className="flex-1 overflow-auto py-3" data-design-locked="true">
          <MainMenu />
        </div>
        <UserProfile />
      </SheetContent>
    </Sheet>
  );
};
