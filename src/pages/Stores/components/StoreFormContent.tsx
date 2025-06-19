import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CardContent } from "@/components/ui/card";
import { MapPin, Truck, Building2, Handshake } from "lucide-react";

interface StoreFormContentProps {
  formData: {
    name: string;
    address: string;
    city?: string;
    state?: string;
    zip_code?: string;
    country?: string;
    phone?: string;
    email?: string;
    tax_id?: string;
    location_type?: string;
    region?: string;
    logistics_zone?: string;
    shipping_cost_multiplier?: number;
    ownership_type?: 'company_owned' | 'franchisee';
    franchise_agreement_date?: string;
    franchise_fee_percentage?: number;
    franchisee_contact_info?: {
      name?: string;
      email?: string;
      phone?: string;
      address?: string;
    };
    is_active: boolean;
  };
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handleSelectChange: (field: string, value: string) => void;
  handleSwitchChange: (checked: boolean) => void;
}

export const StoreFormContent = ({ 
  formData, 
  handleChange, 
  handleSelectChange,
  handleSwitchChange 
}: StoreFormContentProps) => {
  const handleFranchiseeInfoChange = (field: string, value: string) => {
    const updatedInfo = {
      ...formData.franchisee_contact_info,
      [field]: value
    };
    handleSelectChange('franchisee_contact_info', JSON.stringify(updatedInfo));
  };

  return (
    <CardContent className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Store Name <span className="text-red-500">*</span></Label>
          <Input
            id="name"
            name="name"
            value={formData.name || ""}
            onChange={handleChange}
            required
            placeholder="The Croffle Store"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="ownership_type">Ownership Type <span className="text-red-500">*</span></Label>
          <Select
            value={formData.ownership_type || 'company_owned'}
            onValueChange={(value) => handleSelectChange('ownership_type', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select ownership type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="company_owned">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-green-600" />
                  Company Owned
                </div>
              </SelectItem>
              <SelectItem value="franchisee">
                <div className="flex items-center gap-2">
                  <Handshake className="h-4 w-4 text-purple-600" />
                  Franchisee
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {formData.ownership_type === 'franchisee' && (
        <div className="space-y-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <h3 className="text-lg font-semibold text-purple-800 flex items-center gap-2">
            <Handshake className="h-5 w-5" />
            Franchisee Information
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="franchisee_name">Franchisee Name</Label>
              <Input
                id="franchisee_name"
                value={formData.franchisee_contact_info?.name || ""}
                onChange={(e) => handleFranchiseeInfoChange('name', e.target.value)}
                placeholder="John Doe"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="franchisee_email">Franchisee Email</Label>
              <Input
                id="franchisee_email"
                type="email"
                value={formData.franchisee_contact_info?.email || ""}
                onChange={(e) => handleFranchiseeInfoChange('email', e.target.value)}
                placeholder="franchisee@example.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="franchisee_phone">Franchisee Phone</Label>
              <Input
                id="franchisee_phone"
                value={formData.franchisee_contact_info?.phone || ""}
                onChange={(e) => handleFranchiseeInfoChange('phone', e.target.value)}
                placeholder="+63 912 345 6789"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="franchise_agreement_date">Agreement Date</Label>
              <Input
                id="franchise_agreement_date"
                name="franchise_agreement_date"
                type="date"
                value={formData.franchise_agreement_date || ""}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="franchise_fee_percentage">Franchise Fee %</Label>
              <Input
                id="franchise_fee_percentage"
                name="franchise_fee_percentage"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.franchise_fee_percentage || 0}
                onChange={handleChange}
                placeholder="15.00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="franchisee_address">Franchisee Address</Label>
            <Textarea
              id="franchisee_address"
              value={formData.franchisee_contact_info?.address || ""}
              onChange={(e) => handleFranchiseeInfoChange('address', e.target.value)}
              placeholder="Franchisee business address"
              rows={2}
            />
          </div>
        </div>
      )}
      
      <div className="space-y-2">
        <Label htmlFor="location_type">Location Type <span className="text-red-500">*</span></Label>
        <Select
          value={formData.location_type || 'inside_cebu'}
          onValueChange={(value) => handleSelectChange('location_type', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select location type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="inside_cebu">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-green-600" />
                Inside Cebu
              </div>
            </SelectItem>
            <SelectItem value="outside_cebu">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-blue-600" />
                Outside Cebu
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="address">Address <span className="text-red-500">*</span></Label>
        <Textarea
          id="address"
          name="address"
          value={formData.address || ""}
          onChange={handleChange}
          required
          placeholder="123 Main Street"
          rows={2}
        />
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            name="city"
            value={formData.city || ""}
            onChange={handleChange}
            placeholder="Anytown"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="state">State/Province</Label>
          <Input
            id="state"
            name="state"
            value={formData.state || ""}
            onChange={handleChange}
            placeholder="State"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="zip_code">ZIP/Postal Code</Label>
          <Input
            id="zip_code"
            name="zip_code"
            value={formData.zip_code || ""}
            onChange={handleChange}
            placeholder="12345"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="country">Country</Label>
          <Input
            id="country"
            name="country"
            value={formData.country || "Philippines"}
            onChange={handleChange}
            placeholder="Philippines"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="region">Region</Label>
          <Input
            id="region"
            name="region"
            value={formData.region || ""}
            onChange={handleChange}
            placeholder="e.g., Cebu, Bohol, Negros"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="logistics_zone">Logistics Zone</Label>
          <Input
            id="logistics_zone"
            name="logistics_zone"
            value={formData.logistics_zone || ""}
            onChange={handleChange}
            placeholder="e.g., Metro Cebu, South Cebu"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="shipping_cost_multiplier">Shipping Cost Multiplier</Label>
          <Input
            id="shipping_cost_multiplier"
            name="shipping_cost_multiplier"
            type="number"
            step="0.1"
            min="0"
            value={formData.shipping_cost_multiplier || 1.0}
            onChange={handleChange}
            placeholder="1.0"
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number</Label>
          <Input
            id="phone"
            name="phone"
            value={formData.phone || ""}
            onChange={handleChange}
            placeholder="555-123-4567"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            name="email"
            type="email"
            value={formData.email || ""}
            onChange={handleChange}
            placeholder="store@example.com"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="tax_id">Tax ID</Label>
        <Input
          id="tax_id"
          name="tax_id"
          value={formData.tax_id || ""}
          onChange={handleChange}
          placeholder="123-456-789"
        />
      </div>
      
      <div className="flex items-center space-x-2">
        <Switch 
          checked={formData.is_active || false} 
          onCheckedChange={handleSwitchChange}
          id="is_active"
        />
        <Label htmlFor="is_active">Store is active</Label>
      </div>
    </CardContent>
  );
};
