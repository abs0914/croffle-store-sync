
import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/auth";

export function AdminSidebar() {
  const { user, logout } = useAuth();

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-accent-foreground bg-muted hover:bg-muted-foreground hover:text-accent-foreground h-10 px-4 py-2 w-full">
          Admin Menu
        </button>
      </SheetTrigger>
      <SheetContent className="w-full sm:w-[280px]">
        <SheetHeader>
          <SheetTitle>Admin Menu</SheetTitle>
          <SheetDescription>
            System administration
          </SheetDescription>
        </SheetHeader>
        <Separator className="my-4" />
        
        <div className="text-center text-sm text-muted-foreground">
          Please use the main admin sidebar for navigation
        </div>

        <Separator className="my-4" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-accent-foreground bg-muted hover:bg-muted-foreground hover:text-accent-foreground h-10 px-4 py-2 w-full">
              <Avatar className="mr-2">
                <AvatarImage src="https://github.com/shadcn.png" />
                <AvatarFallback>CN</AvatarFallback>
              </Avatar>
              {user?.email}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => logout()}>Logout</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SheetContent>
    </Sheet>
  );
}
