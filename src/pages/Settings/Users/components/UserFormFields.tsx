
import { Store } from "@/types/store";
import { AppUserFormData } from "@/types/appUser";
import { EnhancedRoleSelectionInterface } from "@/components/admin/EnhancedRoleSelectionInterface";
import BasicInfoFields from "./form/BasicInfoFields";
import StoreSelectionList from "./form/StoreSelectionList";
import StatusToggle from "./form/StatusToggle";
import { UserRole } from "@/types/user";

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
  const handleRoleChange = (role: string) => {
    onChange("role", role as UserRole);
  };
  
  const handleStoreSelectionChange = (storeIds: string[]) => {
    onChange("storeIds", storeIds);
  };
  
  const handleStatusChange = (isActive: boolean) => {
    onChange("isActive", isActive);
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
    </div>
  );
}
