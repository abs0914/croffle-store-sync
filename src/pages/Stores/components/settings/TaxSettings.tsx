
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ChangeEvent } from "react";

interface TaxSettingsProps {
  taxPercentage: number;
  isTaxInclusive: boolean;
  onTaxPercentageChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onTaxInclusiveChange: (checked: boolean) => void;
}

export const TaxSettings = ({
  taxPercentage,
  isTaxInclusive,
  onTaxPercentageChange,
  onTaxInclusiveChange
}: TaxSettingsProps) => {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Tax Settings</CardTitle>
        <CardDescription>
          Configure tax rates and calculation methods for this store
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="tax-percentage">Tax Percentage (%)</Label>
          <Input
            id="tax-percentage"
            type="number"
            step="0.01"
            min="0"
            max="100"
            value={taxPercentage}
            onChange={onTaxPercentageChange}
            placeholder="Enter tax percentage"
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <Switch
            id="tax-inclusive"
            checked={isTaxInclusive}
            onCheckedChange={onTaxInclusiveChange}
          />
          <Label htmlFor="tax-inclusive">Tax Inclusive Pricing</Label>
        </div>
      </CardContent>
    </Card>
  );
};
