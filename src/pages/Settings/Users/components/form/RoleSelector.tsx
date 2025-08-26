
import { Label } from "@/components/ui/label";
import { UserRole } from "@/types/user";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useAuth } from "@/contexts/auth";

interface RoleSelectorProps {
  value: UserRole;
  onChange: (value: UserRole) => void;
}

export default function RoleSelector({ value, onChange }: RoleSelectorProps) {
  const { hasPermission } = useAuth();
  const isAdmin = hasPermission('admin');
  
  return (
    <div className="space-y-2">
      <Label htmlFor="role">Role</Label>
      <Select 
        value={value} 
        onValueChange={(value) => onChange(value as UserRole)}
        disabled={!isAdmin}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select a role" />
        </SelectTrigger>
        <SelectContent>
          {isAdmin && <SelectItem value="admin">Admin</SelectItem>}
          <SelectItem value="owner">Owner</SelectItem>
          <SelectItem value="manager">Manager</SelectItem>
          <SelectItem value="commissary_user">Commissary User</SelectItem>
          <SelectItem value="stock_user">Stock User</SelectItem>
          <SelectItem value="production_user">Production User</SelectItem>
          <SelectItem value="cashier">Cashier</SelectItem>
        </SelectContent>
      </Select>
      {!isAdmin && (
        <p className="text-xs text-muted-foreground mt-1">
          Only admins can create other admins
        </p>
      )}
    </div>
  );
}
