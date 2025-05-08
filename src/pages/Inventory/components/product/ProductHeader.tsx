
import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ProductHeaderProps {
  isEditing: boolean;
}

export const ProductHeader = ({ isEditing }: ProductHeaderProps) => {
  const navigate = useNavigate();
  
  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon" onClick={() => navigate('/inventory')}>
        <ArrowLeft className="h-4 w-4" />
      </Button>
      <h1 className="text-2xl font-bold text-croffle-primary">
        {isEditing ? 'Edit Product' : 'Add New Product'}
      </h1>
    </div>
  );
};
