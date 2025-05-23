
import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/auth";
import { useStore } from "@/contexts/StoreContext";

export const UserProfile = () => {
  const { user, logout } = useAuth();
  const { currentStore } = useStore();

  return (
    <div className="p-4 border-t bg-gradient-to-r from-croffle-background to-croffle-light">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Avatar className="border-2 border-croffle-accent">
            <AvatarImage src={user?.avatar} />
            <AvatarFallback className="bg-croffle-primary text-white">{user?.name?.charAt(0) || "U"}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium text-croffle-text">{user?.name || user?.email}</p>
            <p className="text-xs text-muted-foreground">{currentStore?.name || "No store selected"}</p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-croffle-light hover:text-croffle-primary">
              <span className="sr-only">Open user menu</span>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path d="M3 10a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM8.5 10a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM15.5 8.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" />
              </svg>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => logout()}>Log out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="text-xs text-gray-500 text-center mt-2">
        © 2025 Powered by PhilVirtualOffice
      </div>
    </div>
  );
};
