
import {
  DialogHeader as ShadcnDialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";

export default function DialogHeader() {
  return (
    <ShadcnDialogHeader>
      <DialogTitle>Edit User</DialogTitle>
      <DialogDescription>
        Update user information and permissions.
      </DialogDescription>
    </ShadcnDialogHeader>
  );
}
