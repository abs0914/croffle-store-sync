
import React, { useState } from "react";
import { AdminDesktopSidebar } from "./AdminDesktopSidebar";
import { AdminMobileSidebar } from "./AdminMobileSidebar";
import { AdminMobileMenuTrigger } from "./AdminMobileMenuTrigger";

export const AdminSidebar: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <>
      <AdminMobileMenuTrigger onClick={() => setIsMenuOpen(true)} />
      <AdminDesktopSidebar />
      <AdminMobileSidebar 
        isOpen={isMenuOpen} 
        onOpenChange={setIsMenuOpen} 
      />
    </>
  );
};
