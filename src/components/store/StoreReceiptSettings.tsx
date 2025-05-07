
import { Spinner } from "@/components/ui/spinner";
import { useReceiptSettings } from "./receipt-settings/useReceiptSettings";
import ReceiptSettingsForm from "./receipt-settings/ReceiptSettingsForm";

interface StoreReceiptSettingsProps {
  storeId: string;
}

export default function StoreReceiptSettings({ storeId }: StoreReceiptSettingsProps) {
  const { 
    settings, 
    isLoading, 
    isSubmitting, 
    handleChange,
    handleNumberChange,
    handleSelectChange,
    handleSwitchChange,
    handleSubmit 
  } = useReceiptSettings(storeId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Spinner />
      </div>
    );
  }

  return (
    <ReceiptSettingsForm
      settings={settings}
      isSubmitting={isSubmitting}
      handleChange={handleChange}
      handleNumberChange={handleNumberChange}
      handleSelectChange={handleSelectChange}
      handleSwitchChange={handleSwitchChange}
      handleSubmit={handleSubmit}
    />
  );
}
