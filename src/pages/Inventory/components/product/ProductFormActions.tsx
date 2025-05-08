
import React from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Spinner } from "@/components/ui/spinner";

interface ProductFormActionsProps {
  isSubmitting: boolean;
  isEditing: boolean;
}

export const ProductFormActions = ({ isSubmitting, isEditing }: ProductFormActionsProps) => {
  const navigate = useNavigate();
  
  return (
    <div className="flex justify-between">
      <Button 
        type="button" 
        variant="outline" 
        onClick={() => navigate('/inventory')}
      >
        Cancel
      </Button>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting && <Spinner className="mr-2 h-4 w-4" />}
        {isEditing ? 'Update Product' : 'Create Product'}
      </Button>
    </div>
  );
};
