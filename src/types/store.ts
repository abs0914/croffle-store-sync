
export interface Store {
  id: string;
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
  logo_url?: string;
  created_at?: string;
  updated_at?: string;
}

export interface StoreSettings {
  id: string;
  storeId: string;
  receiptHeader: string;
  receiptFooter: string;
  taxPercentage: number;
  isTaxInclusive: boolean;
  currency: string;
  timezone: string;
}
