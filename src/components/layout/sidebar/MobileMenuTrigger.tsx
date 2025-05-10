
import React from "react";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { useStore } from "@/contexts/StoreContext";
import { StoreNameDisplay } from "@/components/shared/StoreNameDisplay";

interface MobileMenuTriggerProps {
  onClick: () => void;
}

export const MobileMenuTrigger: React.FC<MobileMenuTriggerProps> = ({ onClick }) => {
  const { currentStore } = useStore();
  
  return (
    <div className="md:hidden flex items-center fixed top-0 left-0 right-0 z-50 bg-croffle-background/95 backdrop-blur-sm px-4 py-3 border-b shadow-sm">
      <Button 
        variant="ghost" 
        size="icon" 
        className="mr-3"
        onClick={onClick}
      >
        <Menu className="h-6 w-6" />
      </Button>
      
      {currentStore && (
        <StoreNameDisplay 
          variant="compact" 
          size="md" 
          showLogo={true} 
          className="flex-1"
        />
      )}
    </div>
  );
};
