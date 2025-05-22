
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
import { useAddManagerForm } from "../hooks/useAddManagerForm";

interface AddManagerDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  stores: Store[];
}

export default function AddManagerDialog({ isOpen, onOpenChange, stores }: AddManagerDialogProps) {
  const {
    formData,
    isPending,
    handleInputChange,
    handleStoreChange,
    handleActiveChange,
    handleSubmit
  } = useAddManagerForm(onOpenChange);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Add New Manager</DialogTitle>
          <DialogDescription>
            Add a new manager and assign them to stores.
          </DialogDescription>
        </DialogHeader>
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
            <Button
              type="submit"
              disabled={isPending || stores.length === 0}
            >
              {isPending ? <Spinner className="mr-2 h-4 w-4" /> : null}
              Add Manager
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
