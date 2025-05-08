
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

interface TaxSettingsProps {
  taxPercentage: number;
  isTaxInclusive: boolean;
  handleNumberChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSwitchChange: (checked: boolean) => void;
}

export const TaxSettings = ({ 
  taxPercentage, 
  isTaxInclusive, 
  handleNumberChange, 
  handleSwitchChange 
}: TaxSettingsProps) => {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-xl">Tax Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="tax_percentage">Tax Percentage (%)</Label>
            <Input
              id="tax_percentage"
              name="tax_percentage"
              type="number"
              min="0"
              step="0.01"
              value={taxPercentage}
              onChange={handleNumberChange}
            />
          </div>
          
          <div className="flex items-center space-x-2 h-full">
            <Switch 
              checked={isTaxInclusive} 
              onCheckedChange={handleSwitchChange}
              id="is_tax_inclusive"
            />
            <Label htmlFor="is_tax_inclusive">Prices include tax</Label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
