
import { AppUser } from "@/types/appUser";
import { Button } from "@/components/ui/button";
import { PencilIcon, TrashIcon, XCircleIcon, CheckCircleIcon, KeyRound } from "lucide-react";

interface UserTableActionsProps {
  user: AppUser;
  onEdit: (user: AppUser) => void;
  onDelete: (user: AppUser) => void;
  onActivate?: (user: AppUser) => void;
  onDeactivate?: (user: AppUser) => void;
  onResetPassword?: (user: AppUser) => void;
}

export default function UserTableActions({ 
  user, 
  onEdit, 
  onDelete, 
  onActivate, 
  onDeactivate,
  onResetPassword
}: UserTableActionsProps) {
  return (
    <div className="flex justify-end space-x-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onEdit(user)}
        title="Edit user"
        className="h-8 w-8 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
      >
        <PencilIcon className="h-4 w-4" />
      </Button>
      
      {onResetPassword && user.userId && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onResetPassword(user)}
          title="Reset password"
          className="h-8 w-8 p-0 text-purple-600 hover:text-purple-800 hover:bg-purple-50"
        >
          <KeyRound className="h-4 w-4" />
        </Button>
      )}
      
      {user.isActive && onDeactivate ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDeactivate(user)}
          className="h-8 w-8 p-0 text-orange-600 hover:text-orange-800 hover:bg-orange-50"
          title="Deactivate user"
        >
          <XCircleIcon className="h-4 w-4" />
        </Button>
      ) : !user.isActive && onActivate ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onActivate(user)}
          className="h-8 w-8 p-0 text-green-600 hover:text-green-800 hover:bg-green-50"
          title="Activate user"
        >
          <CheckCircleIcon className="h-4 w-4" />
        </Button>
      ) : null}
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onDelete(user)}
        title="Delete user permanently"
        className="h-8 w-8 p-0 text-red-600 hover:text-red-800 hover:bg-red-50"
      >
        <TrashIcon className="h-4 w-4" />
      </Button>
    </div>
  );
}
