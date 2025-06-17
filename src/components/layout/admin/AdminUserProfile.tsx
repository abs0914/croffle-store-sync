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
  return <div className="border-t border-gray-700 p-4 bg-orange-200">
      <div className="flex items-center space-x-3 mb-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-yellow-950">
          <User className="h-4 w-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">
            {user.name}
          </p>
          <p className="text-xs text-gray-400 truncate">
            {user.email}
          </p>
          <p className="text-xs text-blue-400 uppercase font-medium">
            {user.role}
          </p>
        </div>
      </div>
      
      <Button variant="ghost" size="sm" onClick={logout} className="w-full justify-start text-gray-300 hover:text-white bg-zinc-950 hover:bg-zinc-800">
        <LogOut className="mr-2 h-4 w-4" />
        Sign Out
      </Button>
    </div>;
};