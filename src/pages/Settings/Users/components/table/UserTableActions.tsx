
import { AppUser } from "@/types/appUser";
import { Button } from "@/components/ui/button";
import { PencilIcon, TrashIcon, XCircleIcon, CheckCircleIcon } from "lucide-react";

interface UserTableActionsProps {
  user: AppUser;
  onEdit: (user: AppUser) => void;
  onDelete: (user: AppUser) => void;
  onActivate?: (user: AppUser) => void;
  onDeactivate?: (user: AppUser) => void;
}

export default function UserTableActions({ 
  user, 
  onEdit, 
  onDelete, 
  onActivate, 
  onDeactivate 
}: UserTableActionsProps) {
  return (
    <div className="flex justify-end space-x-1">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onEdit(user)}
        title="Edit user"
      >
        <PencilIcon className="h-4 w-4" />
      </Button>
      {user.isActive && onDeactivate ? (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDeactivate(user)}
          className="text-red-600 hover:text-red-800"
          title="Deactivate user"
        >
          <XCircleIcon className="h-4 w-4" />
        </Button>
      ) : !user.isActive && onActivate ? (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onActivate(user)}
          className="text-green-600 hover:text-green-800"
          title="Activate user"
        >
          <CheckCircleIcon className="h-4 w-4" />
        </Button>
      ) : null}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onDelete(user)}
        title="Delete user"
      >
        <TrashIcon className="h-4 w-4" />
      </Button>
    </div>
  );
}
