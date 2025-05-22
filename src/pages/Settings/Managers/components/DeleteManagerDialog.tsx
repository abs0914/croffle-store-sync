
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteManager } from "@/services/manager";
import { Manager } from "@/types/manager";
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

interface DeleteManagerDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  manager: Manager | null;
}

export default function DeleteManagerDialog({ isOpen, onOpenChange, manager }: DeleteManagerDialogProps) {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteManager(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["managers"] });
      onOpenChange(false);
    }
  });

  const handleConfirmDelete = () => {
    if (manager) {
      deleteMutation.mutate(manager.id);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Deletion</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete {manager?.fullName}? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={deleteMutation.isPending}
          >
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleConfirmDelete}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? <Spinner className="mr-2 h-4 w-4" /> : null}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
