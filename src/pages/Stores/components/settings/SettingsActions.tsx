
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface SettingsActionsProps {
  isSaving: boolean;
}

export const SettingsActions = ({ isSaving }: SettingsActionsProps) => {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline">
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
