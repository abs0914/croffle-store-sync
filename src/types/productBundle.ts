
export interface ProductBundle {
  id: string;
  name: string;
  description?: string;
  total_price: number;
  unit_description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  components?: ProductBundleComponent[];
}

export interface ProductBundleComponent {
  id: string;
  bundle_id: string;
  commissary_item_id: string;
  quantity: number;
  unit: string;
  created_at: string;
  commissary_item?: {
    id: string;
    name: string;
    unit: string;
    current_stock: number;
    unit_cost: number;
  };
}

export interface ProductBundleInput {
  name: string;
  description?: string;
  total_price: number;
  unit_description?: string;
  components: {
    commissary_item_id: string;
    quantity: number;
    unit: string;
  }[];
}

// Create a separate type for the limited bundle data in conversion mappings
export interface BundleReference {
  id: string;
  name: string;
  unit_description?: string;
}

export interface EnhancedConversionMapping {
  id: string;
  inventory_stock_id: string;
  recipe_ingredient_name: string;
  recipe_ingredient_unit: string;
  conversion_factor: number;
  notes?: string;
  is_active: boolean;
  bundle_id?: string;
  is_bundle_component: boolean;
  component_ratio: number;
  created_at: string;
  updated_at: string;
  inventory_stock?: {
    id: string;
    item: string;
    unit: string;
    stock_quantity: number;
    fractional_stock: number;
    store_id: string;
  };
  bundle?: BundleReference; // Use the limited bundle reference instead of full ProductBundle
}
