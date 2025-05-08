
import React from "react";
import { Logo } from "./Logo";

interface BrandHeaderProps {
  isMobile?: boolean;
}

export const BrandHeader: React.FC<BrandHeaderProps> = ({ isMobile = false }) => {
  return (
    <div className="flex flex-col items-center py-6 px-4 border-b bg-gradient-to-r from-croffle-background to-croffle-light">
      <Logo />
      <h2 className={`${isMobile ? 'text-lg' : 'text-xl'} font-semibold text-croffle-primary mt-${isMobile ? '1' : '2'}`}>
        PVOSyncPOS
      </h2>
    </div>
  );
};
