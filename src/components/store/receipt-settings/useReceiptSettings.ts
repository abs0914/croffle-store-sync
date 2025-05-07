
import { useState, useEffect } from "react";
import { StoreSettings } from "@/types";
import { toast } from "sonner";
import { fetchStoreSettings, saveStoreSettings } from "./receiptSettingsService";

interface UseReceiptSettingsReturn {
  settings: StoreSettings;
  isLoading: boolean;
  isSubmitting: boolean;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handleNumberChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSelectChange: (name: string, value: string) => void;
  handleSwitchChange: (checked: boolean) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
}

export function useReceiptSettings(storeId: string): UseReceiptSettingsReturn {
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [settings, setSettings] = useState<StoreSettings>({
    id: "",
    storeId: storeId,
    receiptHeader: "",
    receiptFooter: "Thank you for shopping with us!",
    taxPercentage: 0,
    isTaxInclusive: false,
    currency: "USD",
    timezone: "UTC"
  });

  useEffect(() => {
    const loadSettings = async () => {
      setIsLoading(true);
      try {
        const data = await fetchStoreSettings(storeId);
        if (data) {
          setSettings(data);
        }
      } catch (error) {
        toast.error("Failed to load store settings");
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
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
      await saveStoreSettings(settings);
      
      // If this is a new setting being created, we need to fetch it again to get the ID
      if (!settings.id) {
        const updatedSettings = await fetchStoreSettings(storeId);
        if (updatedSettings) {
          setSettings(updatedSettings);
        }
      }
      
      toast.success("Receipt settings saved successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to save settings");
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    settings,
    isLoading,
    isSubmitting,
    handleChange,
    handleNumberChange,
    handleSelectChange,
    handleSwitchChange,
    handleSubmit
  };
}
