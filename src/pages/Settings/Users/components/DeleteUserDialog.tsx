
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteAppUser } from "@/services/appUser";
import { AppUser } from "@/types/appUser";
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
import { toast } from "sonner";
import { useState } from "react";

interface DeleteUserDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  user: AppUser | null;
}

export default function DeleteUserDialog({ isOpen, onOpenChange, user }: DeleteUserDialogProps) {
  const queryClient = useQueryClient();
  const [isAuthUser, setIsAuthUser] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAppUser(id),
    onSuccess: (success) => {
      if (success) {
        queryClient.invalidateQueries({ queryKey: ["app_users"] });
        onOpenChange(false);
      }
    },
    onError: (error: any) => {
      toast.error(`Error deleting user: ${error.message}`);
    }
  });

  const handleConfirmDelete = () => {
    if (user) {
      setIsAuthUser(!!user.userId); // Remember if this was an auth user
      deleteMutation.mutate(user.id);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Deletion</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete {user?.fullName}? This action cannot be undone.
            {user?.userId && (
              <p className="mt-2 text-amber-600 text-sm">
                Note: This user has an associated authentication account that may need to be deleted separately.
              </p>
            )}
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
