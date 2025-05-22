
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AuthFormFieldsProps {
  email: string;
  password: string;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isEditMode?: boolean; 
}

export default function AuthFormFields({
  email,
  password,
  onInputChange,
  isEditMode = false
}: AuthFormFieldsProps) {
  return (
    <div className="space-y-4 border-t pt-4 mt-4">
      <h3 className="font-medium">Account Information</h3>
      <div className="space-y-2">
        <Label htmlFor="email">Email Address</Label>
        <Input
          id="email"
          name="email"
          type="email"
          value={email}
          onChange={onInputChange}
          required
          disabled={isEditMode}
          placeholder="email@example.com"
        />
        <p className="text-xs text-muted-foreground">
          This email will be used for login
        </p>
      </div>
      
      {!isEditMode && (
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            value={password}
            onChange={onInputChange}
            required
            placeholder="••••••••"
            minLength={6}
          />
          <p className="text-xs text-muted-foreground">
            Password must be at least 6 characters long
          </p>
        </div>
      )}
    </div>
  );
}
