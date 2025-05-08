
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CardFooter } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface StoreFormActionsProps {
  isEditing: boolean;
  isSaving: boolean;
}

export const StoreFormActions = ({ isEditing, isSaving }: StoreFormActionsProps) => {
  const navigate = useNavigate();
  
  return (
    <CardFooter className="flex justify-between">
      <Button
        type="button"
        variant="outline"
        onClick={() => navigate("/stores")}
        disabled={isSaving}
      >
        Cancel
      </Button>
      <Button
        type="submit"
        disabled={isSaving}
        className="bg-croffle-primary hover:bg-croffle-primary/90"
      >
        {isSaving ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          <>{isEditing ? "Update Store" : "Create Store"}</>
        )}
      </Button>
    </CardFooter>
  );
};
