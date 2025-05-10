
import React from "react";
import { useStore } from "@/contexts/StoreContext";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
interface StoreNameDisplayProps {
  variant?: "default" | "badge" | "title" | "compact";
  size?: "sm" | "md" | "lg";
  showLogo?: boolean;
  className?: string;
}
export const StoreNameDisplay: React.FC<StoreNameDisplayProps> = ({
  variant = "default",
  size = "md",
  showLogo = false,
  className
}) => {
  const {
    currentStore
  } = useStore();
  if (!currentStore) {
    return <span className="text-muted-foreground italic">No store selected</span>;
  }

  // Size classes
  const sizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-lg"
  };

  // Different display variants
  switch (variant) {
    case "badge":
      return <Badge variant="outline" className={cn("gap-1 font-normal", sizeClasses[size], className)}>
          {showLogo && currentStore.logo_url && <img src={currentStore.logo_url} alt="Store Logo" className="h-4 w-4 object-cover" />}
          <span>{currentStore.name}</span>
        </Badge>;
    case "title":
      return <h2 className={cn("font-semibold truncate", 
                               size === "sm" ? "text-base" : size === "md" ? "text-lg" : "text-xl", 
                               className)}>
               {showLogo && currentStore.logo_url && <img src={currentStore.logo_url} alt={currentStore.name} className="inline-block mr-2 h-5 w-5 object-cover" />}
               {currentStore.name}
             </h2>;
    case "compact":
      return <div className={cn("flex items-center gap-1", className)}>
          {showLogo && currentStore.logo_url && <img src={currentStore.logo_url} alt={currentStore.name} className="h-4 w-4 object-cover" />}
          <span className={cn("truncate", sizeClasses[size])}>
            {currentStore.name}
          </span>
        </div>;
    default:
      return <div className={cn("flex items-center gap-2", className)}>
          {showLogo && currentStore.logo_url && <img src={currentStore.logo_url} alt={currentStore.name} className={cn("object-cover rounded-full", size === "sm" ? "h-6 w-6" : size === "md" ? "h-8 w-8" : "h-10 w-10")} />}
          <span className={cn(sizeClasses[size])}>
            {currentStore.name}
          </span>
        </div>;
  }
};
