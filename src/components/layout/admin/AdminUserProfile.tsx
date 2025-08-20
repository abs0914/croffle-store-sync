import React from "react";
import { useAuth } from "@/contexts/auth";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";
export const AdminUserProfile: React.FC = () => {
  const {
    user,
    logout
  } = useAuth();
  if (!user) return null;
  return (
    <div className="border-t border-croffle-light p-4 bg-gradient-to-r from-croffle-background to-croffle-light">
      <div className="flex items-center space-x-3 mb-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-croffle-accent">
          <User className="h-4 w-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate text-croffle-text">
            {user.name}
          </p>
          <p className="text-xs text-croffle-text/70 truncate">
            {user.email}
          </p>
          <p className="text-xs uppercase font-medium text-croffle-accent">
            {user.role}
          </p>
        </div>
      </div>
      
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={logout} 
        className="w-full justify-start text-croffle-text hover:text-white hover:bg-croffle-accent"
      >
        <LogOut className="mr-2 h-4 w-4" />
        Sign Out
      </Button>
    </div>
  );
};