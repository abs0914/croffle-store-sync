
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

interface BIRSettingsProps {
  birData: {
    tin: string;
    business_name: string;
    machine_accreditation_number: string;
    machine_serial_number: string;
    permit_number: string;
    date_issued: string;
    valid_until: string;
  };
  handleBIRChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
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

export const BIRSettings = ({ birData, handleBIRChange }: BIRSettingsProps) => {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-xl">BIR Compliance Settings</CardTitle>
        <p className="text-sm text-muted-foreground">
          Bureau of Internal Revenue required information for POS accreditation
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="tin">TIN (Taxpayer Identification Number) *</Label>
            <Input
              id="tin"
              name="tin"
              type="text"
              maxLength={12}
              placeholder="123456789000"
              value={birData.tin}
              onChange={handleBIRChange}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="business_name">Business Name *</Label>
            <Input
              id="business_name"
              name="business_name"
              type="text"
              placeholder="Company Name Corp."
              value={birData.business_name}
              onChange={handleBIRChange}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="machine_accreditation_number">Machine Accreditation Number *</Label>
            <Input
              id="machine_accreditation_number"
              name="machine_accreditation_number"
              type="text"
              placeholder="FP012024000001"
              value={birData.machine_accreditation_number}
              onChange={handleBIRChange}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="machine_serial_number">Machine Serial Number *</Label>
            <Input
              id="machine_serial_number"
              name="machine_serial_number"
              type="text"
              placeholder="SN123456789"
              value={birData.machine_serial_number}
              onChange={handleBIRChange}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="permit_number">Permit Number *</Label>
            <Input
              id="permit_number"
              name="permit_number"
              type="text"
              placeholder="ATP123456789"
              value={birData.permit_number}
              onChange={handleBIRChange}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="date_issued">Date Issued</Label>
            <Input
              id="date_issued"
              name="date_issued"
              type="date"
              value={birData.date_issued}
              onChange={handleBIRChange}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="valid_until">Valid Until</Label>
            <Input
              id="valid_until"
              name="valid_until"
              type="date"
              value={birData.valid_until}
              onChange={handleBIRChange}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
