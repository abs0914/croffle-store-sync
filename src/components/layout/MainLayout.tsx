
import React from 'react';
import { Sidebar } from '@/components/navigation/Sidebar';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-screen">
        {/* Navigation Sidebar */}
        <div className="w-64 border-r bg-card">
          <Sidebar />
        </div>
        
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
