
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChangeEvent } from "react";

interface RegionalSettingsProps {
  currency: string;
  timezone: string;
  onCurrencyChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onTimezoneChange: (e: ChangeEvent<HTMLInputElement>) => void;
}

export const RegionalSettings = ({
  currency,
  timezone,
  onCurrencyChange,
  onTimezoneChange
}: RegionalSettingsProps) => {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Regional Settings</CardTitle>
        <CardDescription>
          Configure currency and timezone for this store location
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="currency">Currency</Label>
          <Select value={currency} onValueChange={(value) => onCurrencyChange({ target: { value } } as ChangeEvent<HTMLInputElement>)}>
            <SelectTrigger>
              <SelectValue placeholder="Select currency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PHP">PHP - Philippine Peso</SelectItem>
              <SelectItem value="USD">USD - US Dollar</SelectItem>
              <SelectItem value="EUR">EUR - Euro</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="timezone">Timezone</Label>
          <Select value={timezone} onValueChange={(value) => onTimezoneChange({ target: { value } } as ChangeEvent<HTMLInputElement>)}>
            <SelectTrigger>
              <SelectValue placeholder="Select timezone" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Asia/Manila">Asia/Manila</SelectItem>
              <SelectItem value="America/New_York">America/New_York</SelectItem>
              <SelectItem value="Europe/London">Europe/London</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
};
