
import React from "react";
import { BrandHeader } from "./BrandHeader";
import { StartShiftButton } from "./StartShiftButton";
import { StoreSelector } from "./StoreSelector";
import { MainMenu } from "./MainMenu";
import { UserProfile } from "./UserProfile";

export const DesktopSidebar: React.FC = () => {
  return (
    <div className="hidden md:flex h-screen w-64 flex-col bg-croffle-background border-r">
      <BrandHeader />
      <StartShiftButton />
      <StoreSelector />
      <div className="flex-1 overflow-auto py-2" data-design-locked="true">
        <MainMenu />
      </div>
      <UserProfile />
    </div>
  );
};
