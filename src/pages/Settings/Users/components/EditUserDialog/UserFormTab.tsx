import { AppUserFormData } from "@/types/appUser";
import { Store } from "@/types/store";
import UserFormFields from "../UserFormFields";

interface UserFormTabProps {
  formData: AppUserFormData;
  onChange: (field: keyof AppUserFormData, value: any) => void;
  stores: Store[];
}

export default function UserFormTab({ formData, onChange, stores }: UserFormTabProps) {
  return (
    <UserFormFields
      formData={formData}
      onChange={onChange}
      stores={stores}
      includePassword={false}
      showPermissionOverrides={true}
    />
  );
}