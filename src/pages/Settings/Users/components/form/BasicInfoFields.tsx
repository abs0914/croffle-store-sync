
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppUserFormData } from "@/types/appUser";

interface BasicInfoFieldsProps {
  formData: AppUserFormData;
  onChange: (field: keyof AppUserFormData, value: any) => void;
  includePassword?: boolean;
}

export default function BasicInfoFields({ 
  formData, 
  onChange, 
  includePassword = false 
}: BasicInfoFieldsProps) {
  return (
    <>
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
    </>
  );
}
