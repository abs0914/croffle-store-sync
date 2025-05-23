
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle } from "lucide-react";

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
          This email will be used for login and password resets
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
            minLength={8}
          />
          <div className="flex items-start gap-2 mt-2">
            <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              Password should be at least 8 characters and include uppercase, lowercase letters and numbers.
              The user will be able to reset this password later.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
