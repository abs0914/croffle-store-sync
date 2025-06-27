
export interface CommissaryPurchase {
  id: string;
  commissary_item_id: string;
  supplier_id?: string;
  quantity_purchased: number;
  unit_cost: number;
  total_cost: number;
  purchase_date: string;
  invoice_number?: string;
  batch_number?: string;
  expiry_date?: string;
  notes?: string;
  recorded_by: string;
  created_at: string;
  updated_at: string;
  commissary_item?: {
    id: string;
    name: string;
    unit: string;
    current_stock: number;
    category: string;
  };
  supplier?: {
    id: string;
    name: string;
    contact_person?: string;
    phone?: string;
    email?: string;
  };
}

export interface CommissaryPurchaseForm {
  commissary_item_id: string;
  supplier_id?: string;
  quantity_purchased: number;
  unit_cost: number;
  purchase_date: string;
  invoice_number?: string;
  batch_number?: string;
  expiry_date?: string;
  notes?: string;
}

export interface PurchaseHistory {
  purchase_date: string;
  quantity_purchased: number;
  unit_cost: number;
  total_cost: number;
  supplier_name?: string;
  batch_number?: string;
  notes?: string;
}

// Re-export CommissaryInventoryItem from the correct location
export interface CommissaryInventoryItem {
  id: string;
  name: string;
  category: 'raw_materials' | 'packaging_materials' | 'supplies';
  item_type: 'raw_material' | 'supply' | 'orderable_item';
  current_stock: number;
  minimum_threshold: number;
  uom: string;
  unit_cost?: number;
  supplier_id?: string;
  sku?: string;
  barcode?: string;
  expiry_date?: string;
  storage_location?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  supplier?: {
    id: string;
    name: string;
    contact_person?: string;
    phone?: string;
    email?: string;
  };
}
