
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ConversionBasicInfoProps {
  conversionName: string;
  setConversionName: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
}

export function ConversionBasicInfo({
  conversionName,
  setConversionName,
  description,
  setDescription
}: ConversionBasicInfoProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <Label htmlFor="conversion-name">Repackaging Process</Label>
        <Input
          id="conversion-name"
          value={conversionName}
          onChange={(e) => setConversionName(e.target.value)}
          placeholder="e.g., Nutella 900g Bottle to Sauce Portions"
        />
      </div>
      <div>
        <Label htmlFor="description">Description (Optional)</Label>
        <Input
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief description of the repackaging process"
        />
      </div>
    </div>
  );
}
