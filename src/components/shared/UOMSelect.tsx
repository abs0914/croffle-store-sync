
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { STANDARD_UOM_OPTIONS } from "@/types/commissary";

interface UOMSelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  allowCustom?: boolean;
  className?: string;
}

export const UOMSelect: React.FC<UOMSelectProps> = ({
  value,
  onChange,
  placeholder = "Select UOM",
  allowCustom = true,
  className
}) => {
  const [isCustom, setIsCustom] = React.useState(
    value && !STANDARD_UOM_OPTIONS.includes(value)
  );

  const handleSelectChange = (selectedValue: string) => {
    if (selectedValue === 'custom') {
      setIsCustom(true);
      onChange('');
    } else {
      setIsCustom(false);
      onChange(selectedValue);
    }
  };

  if (isCustom && allowCustom) {
    return (
      <div className="space-y-2">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter custom UOM"
          className={className}
        />
        <button
          type="button"
          onClick={() => setIsCustom(false)}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Choose from standard options
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Select value={value} onValueChange={handleSelectChange}>
        <SelectTrigger className={className}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {STANDARD_UOM_OPTIONS.map((uom) => (
            <SelectItem key={uom} value={uom}>
              {uom}
            </SelectItem>
          ))}
          {allowCustom && (
            <SelectItem value="custom">
              Custom UOM...
            </SelectItem>
          )}
        </SelectContent>
      </Select>
    </div>
  );
};
