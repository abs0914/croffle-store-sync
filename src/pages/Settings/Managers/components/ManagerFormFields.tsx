
import { Store } from "@/types/store";
import { ManagerFormData } from "@/types/manager";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import AuthFormFields from "@/components/shared/AuthFormFields";
import { ManagerFormDataWithAuth } from "../hooks/useAddManagerForm";

interface ManagerFormFieldsProps {
  formData: ManagerFormData | ManagerFormDataWithAuth;
  stores: Store[];
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onStoreChange: (storeId: string, checked: boolean) => void;
  onActiveChange: (checked: boolean) => void;
  isEditMode?: boolean;
}

export default function ManagerFormFields({
  formData,
  stores,
  onInputChange,
  onStoreChange,
  onActiveChange,
  isEditMode = false
}: ManagerFormFieldsProps) {
  // Check if formData has password field (ManagerFormDataWithAuth)
  const hasAuthFields = 'password' in formData;

  return (
    <div className="space-y-4 py-2">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name</Label>
          <Input
            id="firstName"
            name="firstName"
            value={formData.firstName}
            onChange={onInputChange}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            id="lastName"
            name="lastName"
            value={formData.lastName}
            onChange={onInputChange}
            required
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="contactNumber">Contact Number</Label>
        <Input
          id="contactNumber"
          name="contactNumber"
          value={formData.contactNumber}
          onChange={onInputChange}
        />
      </div>
      
      <div className="space-y-2">
        <Label>Assign to Stores</Label>
        <div className="grid grid-cols-2 gap-2 border rounded-md p-4 max-h-48 overflow-y-auto">
          {stores.map((store) => (
            <div key={store.id} className="flex items-center space-x-2">
              <Checkbox
                id={`store-${store.id}`}
                checked={formData.storeIds.includes(store.id)}
                onCheckedChange={(checked) =>
                  onStoreChange(store.id, checked as boolean)
                }
              />
              <Label
                htmlFor={`store-${store.id}`}
                className="text-sm font-normal"
              >
                {store.name}
              </Label>
            </div>
          ))}
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        <Switch
          id="active"
          checked={formData.isActive}
          onCheckedChange={onActiveChange}
        />
        <Label htmlFor="active">Active</Label>
      </div>

      {/* Display auth fields for new managers */}
      {hasAuthFields && (
        <AuthFormFields
          email={(formData as ManagerFormDataWithAuth).email}
          password={(formData as ManagerFormDataWithAuth).password}
          onInputChange={onInputChange}
          isEditMode={isEditMode}
        />
      )}
    </div>
  );
}
