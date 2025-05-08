
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
import { useAuth } from "@/contexts/AuthContext";

export const UserProfile = () => {
  const { user, logout } = useAuth();

  return (
    <div className="p-4 border-t bg-gradient-to-r from-croffle-background to-croffle-light">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="w-full justify-start px-2 hover:bg-transparent">
            <Avatar className="h-8 w-8 mr-2">
              <AvatarImage src={user?.avatarUrl} />
              <AvatarFallback>{user?.name?.charAt(0) || "U"}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col items-start">
              <span className="font-medium text-sm">{user?.name || "User"}</span>
              <span className="text-xs text-gray-500">{user?.email || "user@example.com"}</span>
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => alert("Profile clicked")}>Profile</DropdownMenuItem>
          <DropdownMenuItem onClick={() => alert("Settings clicked")}>Settings</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => logout()}>Logout</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <div className="text-xs text-gray-500 text-center mt-2">
        © 2025 Powered by PhilVirtualOffice
      </div>
    </div>
  );
};
