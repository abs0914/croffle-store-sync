
// Commissary conversion types
export interface ConversionInputItem {
  commissary_item_id: string;
  quantity: number;
  unit: string;
}

export interface ConversionOutputItem {
  name: string;
  quantity: number;
  uom: string;
  category: string;
  unit_cost?: number;
  sku?: string;
  storage_location?: string;
}

export interface ConversionRequest {
  name: string;
  description?: string;
  input_items: ConversionInputItem[];
  output_item: ConversionOutputItem;
}
