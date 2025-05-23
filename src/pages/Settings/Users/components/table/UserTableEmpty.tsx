
import { TableCell, TableRow } from "@/components/ui/table";

interface UserTableEmptyProps {
  colSpan: number;
  message?: string;
}

export default function UserTableEmpty({ colSpan, message = "No users match the current filters" }: UserTableEmptyProps) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="text-center py-6">
        {message}
      </TableCell>
    </TableRow>
  );
}
