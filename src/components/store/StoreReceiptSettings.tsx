
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Spinner } from "@/components/ui/spinner";

interface StoreSettings {
  id: string;
  receiptHeader: string;
  receiptFooter: string;
  taxPercentage: number;
  isTaxInclusive: boolean;
  currency: string;
  timezone: string;
}

interface StoreReceiptSettingsProps {
  storeId: string;
}

export default function StoreReceiptSettings({ storeId }: StoreReceiptSettingsProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [settings, setSettings] = useState<StoreSettings>({
    id: "",
    receiptHeader: "",
    receiptFooter: "Thank you for shopping with us!",
    taxPercentage: 0,
    isTaxInclusive: false,
    currency: "USD",
    timezone: "UTC"
  });

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('store_settings')
          .select('*')
          .eq('store_id', storeId)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned" error
          throw error;
        }

        if (data) {
          setSettings({
            id: data.id,
            receiptHeader: data.receipt_header || "",
            receiptFooter: data.receipt_footer || "Thank you for shopping with us!",
            taxPercentage: data.tax_percentage || 0,
            isTaxInclusive: data.is_tax_inclusive || false,
            currency: data.currency || "USD",
            timezone: data.timezone || "UTC"
          });
        }
      } catch (error) {
        console.error("Error fetching store settings:", error);
        toast.error("Failed to load store settings");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [storeId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleSwitchChange = (checked: boolean) => {
    setSettings(prev => ({ ...prev, isTaxInclusive: checked }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let result;
      
      if (settings.id) {
        // Update existing settings
        result = await supabase
          .from('store_settings')
          .update({
            receipt_header: settings.receiptHeader,
            receipt_footer: settings.receiptFooter,
            tax_percentage: settings.taxPercentage,
            is_tax_inclusive: settings.isTaxInclusive,
            currency: settings.currency,
            timezone: settings.timezone
          })
          .eq('id', settings.id);
      } else {
        // Insert new settings
        result = await supabase
          .from('store_settings')
          .insert({
            store_id: storeId,
            receipt_header: settings.receiptHeader,
            receipt_footer: settings.receiptFooter,
            tax_percentage: settings.taxPercentage,
            is_tax_inclusive: settings.isTaxInclusive,
            currency: settings.currency,
            timezone: settings.timezone
          })
          .select();
          
        if (result.data && result.data[0]) {
          setSettings(prev => ({ ...prev, id: result.data[0].id }));
        }
      }

      if (result.error) throw result.error;
      
      toast.success("Receipt settings saved successfully");
    } catch (error: any) {
      console.error("Error saving store settings:", error);
      toast.error(error.message || "Failed to save settings");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle>Receipt Settings</CardTitle>
          <CardDescription>
            Configure how receipts are displayed to customers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="receiptHeader">Receipt Header</Label>
            <Textarea
              id="receiptHeader"
              name="receiptHeader"
              placeholder="Enter header text that appears at the top of receipts"
              value={settings.receiptHeader}
              onChange={handleChange}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="receiptFooter">Receipt Footer</Label>
            <Textarea
              id="receiptFooter"
              name="receiptFooter"
              placeholder="Enter footer text that appears at the bottom of receipts"
              value={settings.receiptFooter}
              onChange={handleChange}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="taxPercentage">Tax Percentage (%)</Label>
              <Input
                id="taxPercentage"
                name="taxPercentage"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={settings.taxPercentage}
                onChange={handleNumberChange}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select
                value={settings.currency}
                onValueChange={(value) => handleSelectChange('currency', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">US Dollar (USD)</SelectItem>
                  <SelectItem value="EUR">Euro (EUR)</SelectItem>
                  <SelectItem value="GBP">British Pound (GBP)</SelectItem>
                  <SelectItem value="JPY">Japanese Yen (JPY)</SelectItem>
                  <SelectItem value="CAD">Canadian Dollar (CAD)</SelectItem>
                  <SelectItem value="AUD">Australian Dollar (AUD)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select
                value={settings.timezone}
                onValueChange={(value) => handleSelectChange('timezone', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UTC">UTC</SelectItem>
                  <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                  <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                  <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                  <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                  <SelectItem value="Europe/London">London (GMT)</SelectItem>
                  <SelectItem value="Europe/Paris">Paris (CET)</SelectItem>
                  <SelectItem value="Asia/Tokyo">Tokyo (JST)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col justify-end h-full pb-2">
              <div className="flex items-center space-x-2">
                <Switch
                  id="isTaxInclusive"
                  checked={settings.isTaxInclusive}
                  onCheckedChange={handleSwitchChange}
                />
                <Label htmlFor="isTaxInclusive">Prices include tax</Label>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save Settings"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
