
import React from "react";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

interface MobileMenuTriggerProps {
  onClick: () => void;
}

export const MobileMenuTrigger: React.FC<MobileMenuTriggerProps> = ({ onClick }) => {
  return (
    <div className="md:hidden">
      <Button 
        variant="ghost" 
        size="icon" 
        className="fixed top-4 left-4 z-50"
        onClick={onClick}
      >
        <Menu className="h-6 w-6" />
      </Button>
    </div>
  );
};
