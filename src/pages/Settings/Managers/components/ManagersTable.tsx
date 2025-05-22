
import { Manager } from "@/types/manager";
import { Store } from "@/types/store";
import { Button } from "@/components/ui/button";
import { PencilIcon, TrashIcon, PlusCircleIcon } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface ManagersTableProps {
  managers: Manager[];
  isLoading: boolean;
  onAdd: () => void;
  onEdit: (manager: Manager) => void;
  onDelete: (manager: Manager) => void;
  allStores: Store[];
}

export default function ManagersTable({ 
  managers, 
  isLoading, 
  onAdd, 
  onEdit, 
  onDelete,
  allStores 
}: ManagersTableProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (managers.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No managers found.</p>
        <Button onClick={onAdd} variant="outline" className="mt-4">
          <PlusCircleIcon className="mr-2 h-4 w-4" />
          Add your first manager
        </Button>
      </div>
    );
  }

  // Helper function to get store names by IDs
  const getStoreNames = (storeIds: string[]) => {
    return storeIds.map(id => {
      const store = allStores.find(s => s.id === id);
      return store ? store.name : 'Unknown Store';
    });
  };

  return (
    <div className="border rounded-md overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Contact Number</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Assigned Stores</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {managers.map((manager) => (
            <TableRow key={manager.id}>
              <TableCell className="font-medium">{manager.fullName}</TableCell>
              <TableCell>{manager.contactNumber || "N/A"}</TableCell>
              <TableCell>{manager.email || "N/A"}</TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {getStoreNames(manager.storeIds).map((name, index) => (
                    <Badge key={index} variant="outline" className="bg-muted">
                      {name}
                    </Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell>
                <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${manager.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {manager.isActive ? "Active" : "Inactive"}
                </span>
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(manager)}
                >
                  <PencilIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(manager)}
                >
                  <TrashIcon className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
