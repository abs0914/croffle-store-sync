
import { useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useStoreSettings } from './hooks/useStoreSettings';
import { StoreSettingsHeader } from './components/StoreSettingsHeader';
import { ReceiptSettings } from './components/settings/ReceiptSettings';
import { TaxSettings } from './components/settings/TaxSettings';
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
            onReceiptHeaderChange={(e) => handleChange('receipt_header', e.target.value)}
            onReceiptFooterChange={(e) => handleChange('receipt_footer', e.target.value)}
          />
          
          <TaxSettings 
            taxPercentage={settings.tax_percentage}
            isTaxInclusive={settings.is_tax_inclusive}
            onTaxPercentageChange={(e) => handleNumberChange('tax_percentage', parseFloat(e.target.value) || 0)}
            onTaxInclusiveChange={(checked) => handleSwitchChange('is_tax_inclusive', checked)}
          />
          
          <RegionalSettings 
            currency={settings.currency}
            timezone={settings.timezone}
            onCurrencyChange={(e) => handleChange('currency', e.target.value)}
            onTimezoneChange={(e) => handleChange('timezone', e.target.value)}
          />
          
          <SettingsActions isSaving={isSaving} />
        </form>
      </div>
    </div>
  );
}
