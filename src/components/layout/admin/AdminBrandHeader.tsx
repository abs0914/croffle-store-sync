
import React from "react";
import { Settings } from "lucide-react";

interface AdminBrandHeaderProps {
  isMobile?: boolean;
}

export const AdminBrandHeader: React.FC<AdminBrandHeaderProps> = ({ isMobile = false }) => {
  return (
    <div className="flex flex-col items-center py-6 px-4 border-b border-croffle-light bg-gradient-to-r from-croffle-background to-croffle-light">
      <div className="flex items-center justify-center w-12 h-12 bg-croffle-accent rounded-lg mb-2">
        <Settings className="h-6 w-6 text-white" />
      </div>
      
      <h2 className={`${isMobile ? 'text-lg' : 'text-xl'} font-semibold text-croffle-text mt-${isMobile ? '1' : '2'}`}>
        Admin Panel
      </h2>
      <p className="text-sm text-croffle-text/70 text-center">
        System Administration
      </p>
    </div>
  );
};
