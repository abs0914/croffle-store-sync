
import React from "react";
import { AdminBrandHeader } from "./AdminBrandHeader";
import { AdminMainMenu } from "./AdminMainMenu";
import { AdminUserProfile } from "./AdminUserProfile";

export const AdminDesktopSidebar: React.FC = () => {
  return (
    <div className="hidden md:flex h-screen w-64 flex-col bg-croffle-background border-r border-croffle-light">
      <AdminBrandHeader />
      <div className="flex-1 overflow-auto py-2" data-design-locked="true">
        <AdminMainMenu />
      </div>
      <AdminUserProfile />
    </div>
  );
};
