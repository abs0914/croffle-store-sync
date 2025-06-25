
export interface Store {
  id: string;
  name: string;
  address: string;
  city?: string;
  country?: string;
  zip_code?: string;
  phone?: string;
  email?: string;
  created_at?: string;
  updated_at?: string;
  is_active?: boolean;
  location: string;
  ownership_type?: 'company_owned' | 'franchisee';
  franchise_fee_percentage?: number;
  franchise_agreement_date?: string;
  franchisee_contact_info?: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  vat_rate?: number;
  currency?: string;
  receipt_footer?: string;
  receipt_header?: string;
}
