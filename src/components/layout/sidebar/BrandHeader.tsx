
import React from "react";
import { Logo } from "./Logo";
import { useStore } from "@/contexts/StoreContext";
import { useStoreDisplay } from "@/contexts/StoreDisplayContext";
import { StoreNameDisplay } from "@/components/shared/StoreNameDisplay";

interface BrandHeaderProps {
  isMobile?: boolean;
}

export const BrandHeader: React.FC<BrandHeaderProps> = ({ isMobile = false }) => {
  const { currentStore } = useStore();
  const { config } = useStoreDisplay();
  const showStoreName = currentStore && config.sidebarMode !== "hidden";
  
  return (
    <div className="flex flex-col items-center py-6 px-4 border-b bg-gradient-to-r from-croffle-background to-croffle-light">
      <Logo />
      
      {showStoreName ? (
        <StoreNameDisplay 
          variant={config.sidebarMode === "full" ? "title" : "compact"}
          size={isMobile ? "md" : "lg"}
          className={`mt-${isMobile ? '1' : '2'}`}
        />
      ) : (
        <h2 className={`${isMobile ? 'text-lg' : 'text-xl'} font-semibold text-croffle-primary mt-${isMobile ? '1' : '2'}`}>
          PVOSyncPOS
        </h2>
      )}
    </div>
  );
};
