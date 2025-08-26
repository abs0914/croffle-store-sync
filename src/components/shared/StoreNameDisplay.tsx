
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
  const { currentStore } = useStore();
  
  if (!currentStore) {
    return <span className="text-muted-foreground italic text-xs">No store selected</span>;
  }

  // Size classes with better menu fit
  const sizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base"
  };

  // Different display variants optimized for menu layouts
  switch (variant) {
    case "badge":
      return (
        <Badge variant="outline" className={cn("gap-1 font-normal max-w-full", sizeClasses[size], className)}>
          {showLogo && currentStore.logo_url && (
            <img 
              src={currentStore.logo_url} 
              alt="Store Logo" 
              className="h-3 w-3 object-cover rounded-sm flex-shrink-0" 
            />
          )}
          <span className="truncate">{currentStore.name}</span>
        </Badge>
      );
    
    case "title":
      return (
        <h2 className={cn(
          "font-semibold truncate leading-tight", 
          size === "sm" ? "text-sm" : size === "md" ? "text-base" : "text-lg", 
          className
        )}>
          {showLogo && currentStore.logo_url && (
            <img 
              src={currentStore.logo_url} 
              alt={currentStore.name} 
              className="inline-block mr-1.5 h-4 w-4 object-cover rounded-sm align-text-bottom" 
            />
          )}
          <span className="align-middle">{currentStore.name}</span>
        </h2>
      );
    
    case "compact":
      return (
        <div className={cn("flex flex-col items-center gap-1 min-w-0 w-full", className)}>
          {showLogo && currentStore.logo_url && (
            <img 
              src={currentStore.logo_url} 
              alt={currentStore.name} 
              className="h-4 w-4 object-cover rounded-sm flex-shrink-0" 
            />
          )}
          <span className={cn("text-center leading-tight break-words hyphens-auto max-w-full", sizeClasses[size])}>
            {currentStore.name}
          </span>
        </div>
      );
    
    default:
      return (
        <div className={cn("flex items-center gap-2 min-w-0", className)}>
          {showLogo && currentStore.logo_url && (
            <img 
              src={currentStore.logo_url} 
              alt={currentStore.name} 
              className={cn(
                "object-cover rounded-full flex-shrink-0", 
                size === "sm" ? "h-5 w-5" : size === "md" ? "h-6 w-6" : "h-8 w-8"
              )} 
            />
          )}
          <span className={cn("truncate", sizeClasses[size])}>
            {currentStore.name}
          </span>
        </div>
      );
  }
};
