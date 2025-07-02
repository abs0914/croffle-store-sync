
import { useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useStoreSettings } from './hooks/useStoreSettings';
import { StoreSettingsHeader } from './components/StoreSettingsHeader';
import { ReceiptSettings } from './components/settings/ReceiptSettings';
import { TaxSettings, BIRSettings } from './components/settings/TaxSettings';
import { RegionalSettings } from './components/settings/RegionalSettings';
import { SettingsActions } from './components/settings/SettingsActions';

export default function StoreSettings() {
  const { id } = useParams();
  
  const {
    store,
    settings,
    isLoading,
    isSaving,
    handleChange,
    handleNumberChange,
    handleSwitchChange,
    handleSubmit
  } = useStoreSettings(id);
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full py-12">
        <Loader2 className="h-8 w-8 animate-spin text-croffle-primary" />
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-6">
      <div className="max-w-3xl mx-auto">
        <StoreSettingsHeader store={store} />
        
        <form onSubmit={handleSubmit}>
          <ReceiptSettings 
            receiptHeader={settings.receipt_header}
            receiptFooter={settings.receipt_footer}
            handleChange={handleChange}
          />
          
          <TaxSettings 
            taxPercentage={settings.tax_percentage}
            isTaxInclusive={settings.is_tax_inclusive}
            handleNumberChange={handleNumberChange}
            handleSwitchChange={handleSwitchChange}
          />
          
          <BIRSettings 
            birData={{
              tin: store?.tin || '',
              business_name: store?.business_name || '',
              machine_accreditation_number: store?.machine_accreditation_number || '',
              machine_serial_number: store?.machine_serial_number || '',
              permit_number: store?.permit_number || '',
              date_issued: store?.date_issued || '',
              valid_until: store?.valid_until || ''
            }}
            handleBIRChange={handleChange}
          />
          
          <RegionalSettings 
            currency={settings.currency}
            timezone={settings.timezone}
            handleChange={handleChange}
          />
          
          <SettingsActions isSaving={isSaving} />
        </form>
      </div>
    </div>
  );
}
