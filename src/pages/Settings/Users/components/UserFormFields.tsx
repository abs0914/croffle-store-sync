
import { Store } from "@/types/store";
import { AppUserFormData } from "@/types/appUser";
import { EnhancedRoleSelectionInterface } from "@/components/Admin/EnhancedRoleSelectionInterface";
import { PermissionOverrideCheckboxes } from "@/components/Admin/PermissionOverrideCheckboxes";
import BasicInfoFields from "./form/BasicInfoFields";
import StoreSelectionList from "./form/StoreSelectionList";
import StatusToggle from "./form/StatusToggle";
import { UserRole } from "@/types/user";
import { RolePermissions } from "@/types/rolePermissions";
import { useAuth } from "@/contexts/auth";

interface UserFormFieldsProps {
  formData: AppUserFormData;
  onChange: (field: keyof AppUserFormData, value: any) => void;
  stores: Store[];
  includePassword?: boolean;
  showPermissionOverrides?: boolean;
}

export default function UserFormFields({ 
  formData, 
  onChange, 
  stores,
  includePassword = false,
  showPermissionOverrides = false
}: UserFormFieldsProps) {
  const { user: currentUser } = useAuth();
  const isAdminUser = currentUser?.role === 'admin' || currentUser?.role === 'owner';
  const handleRoleChange = (role: string) => {
    onChange("role", role as UserRole);
  };
  
  const handleStoreSelectionChange = (storeIds: string[]) => {
    onChange("storeIds", storeIds);
  };
  
  const handleStatusChange = (isActive: boolean) => {
    onChange("isActive", isActive);
  };

  const handlePermissionChange = (permission: keyof RolePermissions, enabled: boolean | null) => {
    const currentCustomPermissions = formData.customPermissions || {};
    
    if (enabled === null) {
      // Remove the override
      const { [permission]: _, ...remainingPermissions } = currentCustomPermissions;
      onChange("customPermissions", Object.keys(remainingPermissions).length > 0 ? remainingPermissions : undefined);
    } else {
      // Set the override
      onChange("customPermissions", {
        ...currentCustomPermissions,
        [permission]: enabled
      });
    }
  };
  
  return (
    <div className="space-y-4 py-2">
      <BasicInfoFields 
        formData={formData} 
        onChange={onChange}
        includePassword={includePassword} 
      />
      
      <EnhancedRoleSelectionInterface 
        selectedRole={formData.role} 
        onRoleChange={handleRoleChange}
        showPermissions={true}
        showImpactPreview={true}
      />
      
      <StoreSelectionList 
        stores={stores} 
        selectedStoreIds={formData.storeIds}
        onStoreSelectionChange={handleStoreSelectionChange}
      />
      
      <StatusToggle 
        isActive={formData.isActive}
        onChange={handleStatusChange}
      />

      {/* Permission Overrides - Only show for admin users and when explicitly enabled */}
      {isAdminUser && showPermissionOverrides && (
        <PermissionOverrideCheckboxes
          role={formData.role}
          customPermissions={formData.customPermissions}
          onPermissionChange={handlePermissionChange}
        />
      )}
    </div>
  );
}
