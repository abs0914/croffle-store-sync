
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateAppUser } from "@/services/appUser";
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

interface ActivateUserDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  user: AppUser | null;
  isDeactivating?: boolean;
}

export default function ActivateUserDialog({ 
  isOpen, 
  onOpenChange,
  user,
  isDeactivating = false
}: ActivateUserDialogProps) {
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);

  const updateMutation = useMutation({
    mutationFn: updateAppUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app_users"] });
      onOpenChange(false);
    }
  });

  const handleConfirm = async () => {
    if (!user) return;

    setIsProcessing(true);
    await updateMutation.mutateAsync({
      id: user.id,
      isActive: !isDeactivating
    });
    setIsProcessing(false);
  };

  if (!user) return null;

  const title = isDeactivating ? "Deactivate User" : "Activate User";
  const description = isDeactivating 
    ? `Are you sure you want to deactivate ${user.firstName} ${user.lastName}? They won't be able to log in or access the system.` 
    : `Are you sure you want to activate ${user.firstName} ${user.lastName}?`;
  const confirmText = isDeactivating ? "Deactivate" : "Activate";
  const confirmVariant = isDeactivating ? "destructive" : "default";

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <DialogFooter className="pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            variant={confirmVariant as any}
            onClick={handleConfirm}
            disabled={isProcessing}
          >
            {isProcessing ? <Spinner className="mr-2 h-4 w-4" /> : null}
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
