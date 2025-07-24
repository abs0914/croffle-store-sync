
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
  location_type?: 'inside_cebu' | 'outside_cebu';
  region?: string;
  logistics_zone?: string;
  shipping_cost_multiplier?: number;
  ownership_type?: 'company_owned' | 'franchisee';
  franchise_agreement_date?: string;
  franchise_fee_percentage?: number; // Deprecated: Use franchise_fee_amount instead
  franchise_fee_amount?: number;
  franchisee_contact_info?: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  opening_date?: string;
  is_active: boolean;
  logo_url?: string;
  store_location_photo_url?: string;
  // Owner Information
  owner_name?: string;
  owner_address?: string;
  owner_contact_number?: string;
  owner_email?: string;
  business_type?: 'sole_proprietor' | 'corporation' | 'partnership';
  created_at?: string;
  updated_at?: string;
  // BIR Compliance Fields
  tin?: string;
  business_name?: string;
  machine_accreditation_number?: string;
  machine_serial_number?: string;
  pos_version?: string;
  permit_number?: string;
  date_issued?: string;
  valid_until?: string;
  is_bir_accredited?: boolean;
  // Enhanced BIR Compliance Fields
  supplier_name?: string;
  supplier_address?: string;
  supplier_tin?: string;
  accreditation_number?: string;
  accreditation_date?: string;
  bir_final_permit_number?: string;
  is_vat_registered?: boolean;
  non_vat_disclaimer?: string;
  validity_statement?: string;
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
