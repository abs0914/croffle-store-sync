
import { Store } from "@/types/store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { UserRole } from "@/types/user";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { AppUserFormData } from "@/types/appUser";
import { useAuth } from "@/contexts/auth";

interface UserFormFieldsProps {
  formData: AppUserFormData;
  onChange: (field: keyof AppUserFormData, value: any) => void;
  stores: Store[];
  includePassword?: boolean;
}

export default function UserFormFields({ 
  formData, 
  onChange, 
  stores,
  includePassword = false
}: UserFormFieldsProps) {
  const { hasPermission } = useAuth();
  const isAdmin = hasPermission('admin');
  
  return (
    <div className="space-y-4 py-2">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name</Label>
          <Input
            id="firstName"
            value={formData.firstName}
            onChange={(e) => onChange("firstName", e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            id="lastName"
            value={formData.lastName}
            onChange={(e) => onChange("lastName", e.target.value)}
            required
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => onChange("email", e.target.value)}
          required
        />
      </div>
      
      {includePassword && (
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={formData.password || ""}
            onChange={(e) => onChange("password", e.target.value)}
            required
            minLength={6}
          />
          <p className="text-xs text-muted-foreground">Password must be at least 6 characters</p>
        </div>
      )}
      
      <div className="space-y-2">
        <Label htmlFor="contactNumber">Contact Number</Label>
        <Input
          id="contactNumber"
          value={formData.contactNumber}
          onChange={(e) => onChange("contactNumber", e.target.value)}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="role">Role</Label>
        <Select 
          value={formData.role} 
          onValueChange={(value) => onChange("role", value as UserRole)}
          disabled={!isAdmin}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a role" />
          </SelectTrigger>
          <SelectContent>
            {isAdmin && <SelectItem value="admin">Admin</SelectItem>}
            <SelectItem value="owner">Owner</SelectItem>
            <SelectItem value="manager">Manager</SelectItem>
            <SelectItem value="cashier">Cashier</SelectItem>
          </SelectContent>
        </Select>
        {!isAdmin && (
          <p className="text-xs text-muted-foreground mt-1">
            Only admins can create other admins
          </p>
        )}
      </div>
      
      <div className="space-y-2">
        <Label>Assigned Stores</Label>
        <div className="border rounded-md p-3 space-y-2 max-h-48 overflow-y-auto">
          {stores.length === 0 ? (
            <p className="text-sm text-muted-foreground">No stores available</p>
          ) : (
            stores.map((store) => (
              <div key={store.id} className="flex items-center space-x-2">
                <Checkbox 
                  id={`store-${store.id}`}
                  checked={formData.storeIds.includes(store.id)}
                  onCheckedChange={(checked) => {
                    const newStoreIds = checked
                      ? [...formData.storeIds, store.id]
                      : formData.storeIds.filter(id => id !== store.id);
                    onChange("storeIds", newStoreIds);
                  }}
                />
                <Label htmlFor={`store-${store.id}`} className="cursor-pointer">
                  {store.name}
                </Label>
              </div>
            ))
          )}
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        <Switch
          id="isActive"
          checked={formData.isActive}
          onCheckedChange={(checked) => onChange("isActive", checked)}
        />
        <Label htmlFor="isActive">Active</Label>
      </div>
    </div>
  );
}

// Checkbox component for the store selection
function Checkbox({ 
  id, 
  checked, 
  onCheckedChange 
}: { 
  id: string; 
  checked: boolean; 
  onCheckedChange: (checked: boolean) => void 
}) {
  return (
    <div 
      className={`h-4 w-4 border rounded flex items-center justify-center cursor-pointer ${
        checked ? 'bg-primary border-primary' : 'bg-background border-primary-foreground'
      }`}
      onClick={() => onCheckedChange(!checked)}
    >
      {checked && <div className="text-primary-foreground">✓</div>}
    </div>
  );
}
