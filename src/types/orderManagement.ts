
export interface PurchaseOrder {
  id: string;
  order_number: string;
  store_id: string;
  supplier_id?: string;
  created_by: string;
  approved_by?: string;
  fulfilled_by?: string;
  status: 'pending' | 'approved' | 'fulfilled' | 'delivered' | 'cancelled' | 'draft' | 'in_progress' | 'completed';
  total_amount: number;
  requested_delivery_date?: string;
  delivery_scheduled_date?: string;
  delivery_notes?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  approved_at?: string;
  fulfilled_at?: string;
  supplier?: Supplier;
  store?: {
    id: string;
    name: string;
    address: string;
  };
  items?: PurchaseOrderItem[];
}

export interface PurchaseOrderItem {
  id: string;
  purchase_order_id: string;
  inventory_stock_id: string;
  quantity: number;
  unit_price?: number;
  specifications?: string;
  created_at: string;
  inventory_stock?: InventoryStock;
}

export interface DeliveryOrder {
  id: string;
  delivery_number: string;
  purchase_order_id: string;
  status: 'for_delivery' | 'partial_delivery' | 'delivery_complete';
  scheduled_delivery_date?: string;
  actual_delivery_date?: string;
  delivery_notes?: string;
  created_at: string;
  updated_at: string;
  purchase_order?: PurchaseOrder;
}

export interface GoodsReceivedNote {
  id: string;
  grn_number: string;
  purchase_order_id: string;
  received_by: string;
  status: 'pending' | 'verified' | 'discrepancy_noted';
  quality_check_passed?: boolean;
  remarks?: string;
  digital_signature?: string;
  received_at: string;
  created_at: string;
  purchase_order?: PurchaseOrder;
  items?: GRNItem[];
}

export interface GRNItem {
  id: string;
  grn_id: string;
  purchase_order_item_id: string;
  ordered_quantity: number;
  received_quantity: number;
  quality_status: string;
  item_remarks?: string;
  created_at: string;
  purchase_order_item?: PurchaseOrderItem;
}

export interface OrderAuditTrail {
  id: string;
  order_id: string;
  order_type: 'purchase' | 'delivery' | 'grn';
  action: string;
  old_status?: string;
  new_status?: string;
  changed_by: string;
  change_reason?: string;
  created_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  lead_time_days: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InventoryStock {
  id: string;
  store_id: string;
  item: string;
  unit: string;
  stock_quantity: number;
  cost?: number;
  sku?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
