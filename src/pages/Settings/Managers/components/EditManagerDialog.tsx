
import { Manager } from "@/types/manager";
import { Store } from "@/types/store";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ManagerFormFields from "./ManagerFormFields";
import { useManagerForm } from "../hooks/useManagerForm";

interface EditManagerDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  manager: Manager | null;
  stores: Store[];
}

export default function EditManagerDialog({ 
  isOpen, 
  onOpenChange, 
  manager, 
  stores 
}: EditManagerDialogProps) {
  const {
    formData,
    isPending,
    handleInputChange,
    handleStoreChange,
    handleActiveChange,
    handleSubmit
  } = useManagerForm(manager, onOpenChange);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Edit Manager</DialogTitle>
          <DialogDescription>
            Update manager details and store assignments.
          </DialogDescription>
        </DialogHeader>
        
        {manager && (
          <form onSubmit={handleSubmit}>
            <ManagerFormFields
              formData={formData}
              stores={stores}
              onInputChange={handleInputChange}
              onStoreChange={handleStoreChange}
              onActiveChange={handleActiveChange}
            />
            
            <DialogFooter className="pt-4">
              <Button
                variant="outline"
                type="button"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? <Spinner className="mr-2 h-4 w-4" /> : null}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
