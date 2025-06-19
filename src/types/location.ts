
export type LocationType = 'inside_cebu' | 'outside_cebu';

export interface LocationPricing {
  id: string;
  commissary_item_id: string;
  location_type: LocationType;
  base_price: number;
  markup_percentage: number;
  minimum_order_quantity: number;
  shipping_cost: number;
  lead_time_days: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RegionalSupplier {
  id: string;
  supplier_id: string;
  location_type: LocationType;
  priority: number;
  is_preferred: boolean;
  shipping_cost: number;
  lead_time_days: number;
  supplier?: {
    id: string;
    name: string;
    contact_person?: string;
    phone?: string;
    email?: string;
  };
}

export interface LocationPricingInfo {
  base_price: number;
  markup_percentage: number;
  final_price: number;
  minimum_order_quantity: number;
  shipping_cost: number;
  lead_time_days: number;
}
