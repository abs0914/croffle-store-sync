
import React from 'react';
import { useLocation } from "react-router-dom";
import { AdminSidebar } from './AdminSidebar';
import { StoreSidebar } from './StoreSidebar';

export function Sidebar() {
  const location = useLocation();

  // Don't show store-specific menu items for admin users
  const isAdminArea = location.pathname.startsWith('/admin');
  
  if (isAdminArea) {
    return <AdminSidebar />;
  }

  return <StoreSidebar />;
}
