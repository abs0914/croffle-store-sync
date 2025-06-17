
import React from "react";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

interface AdminMobileMenuTriggerProps {
  onClick: () => void;
}

export const AdminMobileMenuTrigger: React.FC<AdminMobileMenuTriggerProps> = ({ onClick }) => {
  return (
    <div className="md:hidden flex items-center fixed top-0 left-0 right-0 z-50 bg-gray-900/95 backdrop-blur-sm px-4 py-3 border-b border-gray-700 shadow-sm">
      <Button 
        variant="ghost" 
        size="icon" 
        className="mr-3 text-gray-300 hover:text-white hover:bg-gray-800"
        onClick={onClick}
      >
        <Menu className="h-6 w-6" />
      </Button>
      
      <h2 className="text-lg font-semibold text-white flex-1">
        Admin Panel
      </h2>
    </div>
  );
};
