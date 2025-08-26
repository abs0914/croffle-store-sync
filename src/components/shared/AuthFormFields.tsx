
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Shield, Check, X } from "lucide-react";
import { useState, useEffect } from "react";
import { VALIDATION_PATTERNS, validateUserInput } from "@/utils/securityConfig";
import { useSecurityAudit } from "@/hooks/useSecurityAudit";

interface AuthFormFieldsProps {
  email: string;
  password: string;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isEditMode?: boolean; 
}

interface PasswordStrength {
  hasMinLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  isValid: boolean;
}

export default function AuthFormFields({
  email,
  password,
  onInputChange,
  isEditMode = false
}: AuthFormFieldsProps) {
  const [emailValidation, setEmailValidation] = useState({ isValid: true, reason: '' });
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({
    hasMinLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    isValid: false
  });
  const { logSecurityEvent } = useSecurityAudit();

  // Validate email on change
  useEffect(() => {
    if (email) {
      const isValidFormat = VALIDATION_PATTERNS.EMAIL.test(email);
      const inputValidation = validateUserInput(email);
      
      if (!inputValidation.isValid) {
        logSecurityEvent('suspicious_input_detected', { 
          field: 'email', 
          value: email.substring(0, 50) 
        }, 'medium');
      }
      
      setEmailValidation({
        isValid: isValidFormat && inputValidation.isValid,
        reason: !isValidFormat ? 'Invalid email format' : inputValidation.reason || ''
      });
    }
  }, [email, logSecurityEvent]);

  // Check password strength on change
  useEffect(() => {
    if (password) {
      const strength: PasswordStrength = {
        hasMinLength: password.length >= 8,
        hasUppercase: /[A-Z]/.test(password),
        hasLowercase: /[a-z]/.test(password),
        hasNumber: /[0-9]/.test(password),
        isValid: false
      };
      
      strength.isValid = strength.hasMinLength && 
                        strength.hasUppercase && 
                        strength.hasLowercase && 
                        strength.hasNumber;
      
      setPasswordStrength(strength);
    }
  }, [password]);

  const PasswordStrengthIndicator = ({ label, isValid }: { label: string; isValid: boolean }) => (
    <div className="flex items-center gap-2 text-xs">
      {isValid ? (
        <Check className="h-3 w-3 text-green-500" />
      ) : (
        <X className="h-3 w-3 text-red-500" />
      )}
      <span className={isValid ? 'text-green-600' : 'text-red-600'}>
        {label}
      </span>
    </div>
  );
  return (
    <div className="space-y-4 border-t pt-4 mt-4">
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5 text-primary" />
        <h3 className="font-medium">Secure Account Information</h3>
      </div>
      
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
          className={emailValidation.isValid ? '' : 'border-red-500'}
        />
        {!emailValidation.isValid && email && (
          <div className="flex items-center gap-2 text-xs text-red-600">
            <X className="h-3 w-3" />
            {emailValidation.reason}
          </div>
        )}
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
            className={passwordStrength.isValid || !password ? '' : 'border-orange-500'}
          />
          
          {password && (
            <div className="space-y-2 p-3 bg-muted rounded-md">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Shield className="h-4 w-4" />
                Password Strength
              </div>
              <div className="grid grid-cols-2 gap-2">
                <PasswordStrengthIndicator 
                  label="8+ characters" 
                  isValid={passwordStrength.hasMinLength} 
                />
                <PasswordStrengthIndicator 
                  label="Uppercase letter" 
                  isValid={passwordStrength.hasUppercase} 
                />
                <PasswordStrengthIndicator 
                  label="Lowercase letter" 
                  isValid={passwordStrength.hasLowercase} 
                />
                <PasswordStrengthIndicator 
                  label="Number" 
                  isValid={passwordStrength.hasNumber} 
                />
              </div>
              {passwordStrength.isValid && (
                <div className="flex items-center gap-2 text-xs text-green-600 font-medium">
                  <Check className="h-3 w-3" />
                  Strong password
                </div>
              )}
            </div>
          )}
          
          <div className="flex items-start gap-2 mt-2">
            <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              Use a strong password with a mix of letters, numbers and symbols.
              The user will be able to reset this password later.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
