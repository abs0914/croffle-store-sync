
import React, { useState } from "react";
import { DesktopSidebar } from "./DesktopSidebar";
import { MobileSidebar } from "./MobileSidebar";
import { MobileMenuTrigger } from "./MobileMenuTrigger";

const Sidebar: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <>
      <MobileMenuTrigger onClick={() => setIsMenuOpen(true)} />
      <DesktopSidebar />
      <MobileSidebar 
        isOpen={isMenuOpen} 
        onOpenChange={setIsMenuOpen} 
      />
    </>
  );
};

export default Sidebar;
