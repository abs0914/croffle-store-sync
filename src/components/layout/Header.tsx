
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/auth";
import { useStore } from "@/contexts/StoreContext";
import { useStoreDisplay } from "@/contexts/StoreDisplayContext";
import { User, Settings } from "lucide-react";
import { StoreNameDisplay } from "@/components/shared/StoreNameDisplay";

// This component is no longer used in the main layout
export function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="hidden">
      {/* Header contents are hidden but kept for backward compatibility */}
    </header>
  );
}
