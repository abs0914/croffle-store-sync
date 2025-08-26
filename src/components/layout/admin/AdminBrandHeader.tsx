
import React from "react";

interface AdminBrandHeaderProps {
  isMobile?: boolean;
}

export const AdminBrandHeader: React.FC<AdminBrandHeaderProps> = ({ isMobile = false }) => {
  return (
    <div className="flex flex-col items-center py-6 px-4 border-b border-croffle-light bg-gradient-to-r from-croffle-background to-croffle-light">
      <div className="w-12 h-12 mb-2">
        <img 
          src="/lovable-uploads/cb3fd8e0-b11b-485f-af2f-41b76a79fbba.png" 
          alt="The Croffle Store" 
          className="w-full h-full object-contain"
        />
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
