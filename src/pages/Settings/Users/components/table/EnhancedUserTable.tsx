import { AppUser } from "@/types/appUser";
import { Store } from "@/types/store";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import EnhancedUserTableRow from "./EnhancedUserTableRow";
import UserTableEmpty from "./UserTableEmpty";

interface EnhancedUserTableProps {
  users: AppUser[];
  allStores: Store[];
  onEdit: (user: AppUser) => void;
  onDelete: (user: AppUser) => void;
  onActivate?: (user: AppUser) => void;
  onDeactivate?: (user: AppUser) => void;
  onResetPassword?: (user: AppUser) => void;
}

export default function EnhancedUserTable({
  users,
  allStores,
  onEdit,
  onDelete,
  onActivate,
  onDeactivate,
  onResetPassword
}: EnhancedUserTableProps) {
  if (users.length === 0) {
    return <UserTableEmpty colSpan={7} />;
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Stores</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <EnhancedUserTableRow
              key={user.id}
              user={user}
              allStores={allStores}
              onEdit={onEdit}
              onDelete={onDelete}
              onActivate={onActivate}
              onDeactivate={onDeactivate}
              onResetPassword={onResetPassword}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}