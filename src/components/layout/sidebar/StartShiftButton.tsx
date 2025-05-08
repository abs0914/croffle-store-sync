
import React from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { designClass } from "@/utils/designSystem";

export const StartShiftButton: React.FC = () => {
  const navigate = useNavigate();
  
  return (
    <div className="px-3 py-4">
      <Button 
        className={designClass("sidebar.startShift")}
        onClick={() => navigate("/pos")}
      >
        Start Shift
      </Button>
    </div>
  );
};
