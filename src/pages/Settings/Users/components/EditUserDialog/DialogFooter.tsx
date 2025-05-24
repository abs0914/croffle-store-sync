
import { Button } from "@/components/ui/button";
import { DialogFooter as ShadcnDialogFooter } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";

interface DialogFooterProps {
  isPending: boolean;
  onClose: () => void;
  activeTab: string;
}

export default function DialogFooter({ isPending, onClose, activeTab }: DialogFooterProps) {
  return (
    <ShadcnDialogFooter className="pt-4 mt-4">
      <Button 
        variant="outline" 
        type="button" 
        onClick={onClose}
        disabled={isPending}
      >
        Cancel
      </Button>
      {activeTab === "general" && (
        <Button 
          form="user-form"
          type="submit" 
          disabled={isPending}
        >
          {isPending ? <Spinner className="mr-2 h-4 w-4" /> : null}
          Save Changes
        </Button>
      )}
    </ShadcnDialogFooter>
  );
}
