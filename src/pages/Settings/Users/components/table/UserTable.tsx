
import { AppUser } from "@/types/appUser";
import { Store } from "@/types/store";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import UserTableRow from "./UserTableRow";
import UserTableEmpty from "./UserTableEmpty";

interface UserTableProps {
  users: AppUser[];
  allStores: Store[];
  onEdit: (user: AppUser) => void;
  onDelete: (user: AppUser) => void;
  onActivate?: (user: AppUser) => void;
  onDeactivate?: (user: AppUser) => void;
}

export default function UserTable({
  users,
  allStores,
  onEdit,
  onDelete,
  onActivate,
  onDeactivate
}: UserTableProps) {
  return (
    <div className="border rounded-md overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Assigned Stores</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length > 0 ? (
            users.map((user) => (
              <UserTableRow
                key={user.id}
                user={user}
                allStores={allStores}
                onEdit={onEdit}
                onDelete={onDelete}
                onActivate={onActivate}
                onDeactivate={onDeactivate}
              />
            ))
          ) : (
            <UserTableEmpty colSpan={7} />
          )}
        </TableBody>
      </Table>
    </div>
  );
}
