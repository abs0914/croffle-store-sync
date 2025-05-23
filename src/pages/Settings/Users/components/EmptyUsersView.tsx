
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { UsersIcon, UserPlusIcon } from "lucide-react";

interface EmptyUsersViewProps {
  onAddUser: () => void;
  canManageUsers: boolean;
}

export default function EmptyUsersView({ onAddUser, canManageUsers }: EmptyUsersViewProps) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center p-12">
        <div className="bg-muted rounded-full p-4 mb-4">
          <UsersIcon className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-2">No users found</h3>
        <p className="text-muted-foreground text-center mb-6 max-w-md">
          {canManageUsers 
            ? "You haven't added any users to the system yet. Add your first user to get started."
            : "You don't have permission to view users or no users have been added yet."}
        </p>
        {canManageUsers && (
          <Button onClick={onAddUser}>
            <UserPlusIcon className="mr-2 h-4 w-4" />
            Add Your First User
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
