
import React from "react";
import { Settings } from "lucide-react";

interface AdminBrandHeaderProps {
  isMobile?: boolean;
}

export const AdminBrandHeader: React.FC<AdminBrandHeaderProps> = ({ isMobile = false }) => {
  return (
    <div className="flex flex-col items-center py-6 px-4 border-b border-gray-700 bg-gradient-to-r from-gray-900 to-gray-800">
      <div className="flex items-center justify-center w-12 h-12 bg-blue-600 rounded-lg mb-2">
        <Settings className="h-6 w-6 text-white" />
      </div>
      
      <h2 className={`${isMobile ? 'text-lg' : 'text-xl'} font-semibold text-white mt-${isMobile ? '1' : '2'}`}>
        Admin Panel
      </h2>
      <p className="text-sm text-gray-400 text-center">
        System Administration
      </p>
    </div>
  );
};
