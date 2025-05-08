
import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowUpDown } from "lucide-react";

interface StockAdjustmentButtonProps {
  onClick: () => void;
}

export const StockAdjustmentButton = ({ onClick }: StockAdjustmentButtonProps) => {
  return (
    <Button 
      variant="ghost" 
      size="sm" 
      onClick={onClick} 
      className="text-xs text-muted-foreground"
    >
      <ArrowUpDown className="h-3 w-3 mr-1" />
      Adjust
    </Button>
  );
};
