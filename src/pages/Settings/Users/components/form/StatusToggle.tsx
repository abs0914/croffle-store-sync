
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface StatusToggleProps {
  isActive: boolean;
  onChange: (isActive: boolean) => void;
}

export default function StatusToggle({ isActive, onChange }: StatusToggleProps) {
  return (
    <div className="flex items-center space-x-2">
      <Switch
        id="isActive"
        checked={isActive}
        onCheckedChange={onChange}
      />
      <Label htmlFor="isActive">Active</Label>
    </div>
  );
}
