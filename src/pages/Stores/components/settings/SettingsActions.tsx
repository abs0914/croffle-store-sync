
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface SettingsActionsProps {
  isSaving: boolean;
}

export const SettingsActions = ({ isSaving }: SettingsActionsProps) => {
  const navigate = useNavigate();
  
  return (
    <div className="flex justify-between">
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
          "Save Settings"
        )}
      </Button>
    </div>
  );
};
