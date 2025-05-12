
import { Cashier } from "@/types/cashier";
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

interface CashiersTableProps {
  cashiers: Cashier[];
  isLoading: boolean;
  onAdd: () => void;
  onEdit: (cashier: Cashier) => void;
  onDelete: (cashier: Cashier) => void;
}

export default function CashiersTable({ cashiers, isLoading, onAdd, onEdit, onDelete }: CashiersTableProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (cashiers.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No cashiers found for this store.</p>
        <Button onClick={onAdd} variant="outline" className="mt-4">
          <PlusCircleIcon className="mr-2 h-4 w-4" />
          Add your first cashier
        </Button>
      </div>
    );
  }

  return (
    <div className="border rounded-md overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Contact Number</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cashiers.map((cashier) => (
            <TableRow key={cashier.id}>
              <TableCell className="font-medium">{cashier.fullName}</TableCell>
              <TableCell>{cashier.contactNumber || "N/A"}</TableCell>
              <TableCell>
                <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${cashier.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {cashier.isActive ? "Active" : "Inactive"}
                </span>
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(cashier)}
                >
                  <PencilIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(cashier)}
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
