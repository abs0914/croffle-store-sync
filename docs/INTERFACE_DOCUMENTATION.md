## 🏗️ Core Data Model Interfaces

### Store Management Interfaces

#### Store
```typescript
interface Store {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  tin?: string;
  business_permit?: string;
  machine_serial?: string;
  accreditation_number?: string;
  permit_number?: string;
  date_issued?: string;
  valid_until?: string;
  is_active: boolean;
  settings: StoreSettings;
  created_at: string;
  updated_at: string;
}

interface StoreSettings {
  timezone: string;
  currency: string;
  tax_rate: number;
  receipt_footer?: string;
  enable_bir_compliance: boolean;
  enable_thermal_printing: boolean;
  printer_config: PrinterConfig;
  pos_settings: POSSettings;
}

interface POSSettings {
  enable_discounts: boolean;
  enable_split_payments: boolean;
  require_customer_info: boolean;
  auto_print_receipt: boolean;
  enable_barcode_scanning: boolean;
  default_payment_method: PaymentMethod;
}
```

#### AppUser
```typescript
interface AppUser {
  id: string;
  user_id: string; // Supabase auth user ID
  store_id: string;
  email: string;
  full_name?: string;
  role: UserRole;
  permissions: UserPermissions;
  is_active: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

type UserRole = 'admin' | 'owner' | 'manager' | 'staff';

interface UserPermissions {
  pos: POSPermissions;
  inventory: InventoryPermissions;
  reports: ReportPermissions;
  admin: AdminPermissions;
}

interface POSPermissions {
  can_process_sales: boolean;
  can_apply_discounts: boolean;
  can_void_transactions: boolean;
  can_access_cash_drawer: boolean;
  max_discount_percentage: number;
}

interface InventoryPermissions {
  can_view_inventory: boolean;
  can_update_stock: boolean;
  can_create_items: boolean;
  can_delete_items: boolean;
  can_manage_conversions: boolean;
  can_access_commissary: boolean;
}
```

### Inventory Management Interfaces

#### InventoryItem (Store-Level)
```typescript
interface InventoryItem {
  id: string;
  store_id: string;
  name: string;
  description?: string;
  category: string;
  sku: string;
  barcode?: string;
  unit_of_measure: UnitOfMeasure;
  cost_price: number;
  selling_price: number;
  current_quantity: number;
  minimum_stock: number;
  maximum_stock?: number;
  reorder_point: number;
  is_active: boolean;
  is_recipe_item: boolean;
  commissary_item_id?: string;
  created_at: string;
  updated_at: string;
}

type UnitOfMeasure = 'pieces' | 'kg' | 'grams' | 'liters' | 'ml' | 'meters' | 'cm';

interface CommissaryItem {
  id: string;
  name: string;
  description?: string;
  category: string;
  sku: string;
  unit_of_measure: UnitOfMeasure;
  cost_price: number;
  current_quantity: number;
  minimum_stock: number;
  supplier_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
```

#### Inventory Transactions
```typescript
interface InventoryTransaction {
  id: string;
  store_id?: string;
  inventory_item_id?: string;
  commissary_item_id?: string;
  transaction_type: TransactionType;
  quantity_change: number;
  unit_cost?: number;
  total_cost?: number;
  reference_id?: string;
  reference_type?: string;
  notes?: string;
  user_id?: string;
  created_at: string;
}

type TransactionType = 
  | 'sale' 
  | 'purchase' 
  | 'adjustment' 
  | 'transfer' 
  | 'conversion' 
  | 'waste' 
  | 'return' 
  | 'recipe_usage';

interface StockAdjustment {
  item_id: string;
  quantity_change: number;
  reason: AdjustmentReason;
  notes?: string;
}

type AdjustmentReason = 
  | 'count_correction' 
  | 'damage' 
  | 'expiry' 
  | 'theft' 
  | 'other';
```

#### Inventory Conversions
```typescript
interface InventoryConversion {
  id: string;
  store_id: string;
  commissary_item_id: string;
  store_item_id: string;
  conversion_ratio: number; // How much commissary item per store item
  unit_cost?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ConversionRequest {
  conversion_id: string;
  quantity: number;
  notes?: string;
}

interface ConversionResult {
  success: boolean;
  commissary_deducted: number;
  store_item_added: number;
  cost: number;
  transaction_ids: string[];
}
```

### Recipe System Interfaces

#### Recipe
```typescript
interface Recipe {
  id: string;
  store_id: string;
  name: string;
  description?: string;
  category: string;
  serving_size: number;
  prep_time_minutes?: number;
  instructions?: string;
  cost_per_serving?: number;
  selling_price?: number;
  is_active: boolean;
  ingredients: RecipeIngredient[];
  created_at: string;
  updated_at: string;
}

interface RecipeIngredient {
  id: string;
  recipe_id: string;
  inventory_item_id: string;
  quantity_required: number;
  unit_of_measure: UnitOfMeasure;
  cost_per_unit?: number;
  is_optional: boolean;
  notes?: string;
  inventory_item?: InventoryItem; // Populated via join
}

interface RecipeUsageLog {
  id: string;
  recipe_id: string;
  transaction_id?: string;
  quantity_used: number;
  total_cost?: number;
  user_id?: string;
  created_at: string;
}
```

### Order Management Interfaces

#### Supplier
```typescript
interface Supplier {
  id: string;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  tin?: string;
  payment_terms?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Order {
  id: string;
  order_number: string;
  supplier_id: string;
  store_id?: string;
  status: OrderStatus;
  order_date: string;
  expected_delivery?: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  notes?: string;
  created_by?: string;
  items: OrderItem[];
  supplier?: Supplier; // Populated via join
  created_at: string;
  updated_at: string;
}

type OrderStatus = 
  | 'draft' 
  | 'sent' 
  | 'confirmed' 
  | 'partial' 
  | 'completed' 
  | 'cancelled';

interface OrderItem {
  id: string;
  order_id: string;
  commissary_item_id?: string;
  inventory_item_id?: string;
  quantity_ordered: number;
  quantity_received: number;
  unit_price: number;
  total_price: number;
  notes?: string;
  commissary_item?: CommissaryItem;
  inventory_item?: InventoryItem;
}
```

## 🛒 POS System Interfaces

### Transaction Interfaces

#### Transaction
```typescript
interface Transaction {
  id: string;
  store_id: string;
  transaction_number: string;
  customer_id?: string;
  user_id: string;
  status: TransactionStatus;
  items: TransactionItem[];
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  payment_method: PaymentMethod;
  payment_details: PaymentDetails;
  notes?: string;
  created_at: string;
  updated_at: string;
}

type TransactionStatus = 'pending' | 'completed' | 'voided' | 'refunded';

interface TransactionItem {
  id: string;
  transaction_id: string;
  inventory_item_id?: string;
  recipe_id?: string;
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  discount_amount?: number;
  notes?: string;
}

interface CartItem {
  id: string;
  product_id: string;
  recipe_id?: string;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
  discount?: Discount;
  notes?: string;
}
```

#### Payment Interfaces
```typescript
type PaymentMethod = 'cash' | 'card' | 'gcash' | 'paymaya' | 'grab_pay' | 'other';

interface PaymentDetails {
  method: PaymentMethod;
  amount_tendered: number;
  change_amount?: number;
  reference_number?: string;
  card_details?: CardPaymentDetails;
  digital_wallet_details?: DigitalWalletDetails;
  split_payments?: SplitPayment[];
}

interface CardPaymentDetails {
  card_type: 'credit' | 'debit';
  last_four_digits: string;
  approval_code?: string;
  terminal_id?: string;
}

interface DigitalWalletDetails {
  wallet_type: PaymentMethod;
  reference_number: string;
  phone_number?: string;
}

interface SplitPayment {
  method: PaymentMethod;
  amount: number;
  details: Partial<PaymentDetails>;
}

interface Discount {
  id: string;
  type: DiscountType;
  name: string;
  value: number; // Percentage or fixed amount
  max_amount?: number;
  conditions?: DiscountConditions;
}

type DiscountType = 'percentage' | 'fixed_amount' | 'buy_x_get_y';

interface DiscountConditions {
  min_purchase_amount?: number;
  applicable_categories?: string[];
  applicable_items?: string[];
  max_uses_per_customer?: number;
}
```

## 🖨️ Printing System Interfaces

### Thermal Printer Interfaces
```typescript
interface PrinterConfig {
  width: number; // Paper width in mm (58 or 80)
  font_size: number;
  font_family: string;
  alignment: PrintAlignment;
  cut_paper: boolean;
  open_drawer: boolean;
  copies: number;
  bluetooth_address?: string;
  usb_vendor_id?: string;
  usb_product_id?: string;
}

type PrintAlignment = 'left' | 'center' | 'right';

interface PrintContent {
  header: PrintSection;
  body: PrintSection;
  footer: PrintSection;
}

interface PrintSection {
  lines: PrintLine[];
}

interface PrintLine {
  text: string;
  alignment?: PrintAlignment;
  font_size?: number;
  bold?: boolean;
  underline?: boolean;
  double_height?: boolean;
  double_width?: boolean;
}

interface PrintJob {
  id: string;
  content: PrintContent;
  config: PrinterConfig;
  status: PrintJobStatus;
  error_message?: string;
  created_at: string;
  completed_at?: string;
}

type PrintJobStatus = 'pending' | 'printing' | 'completed' | 'failed';

interface PrintError {
  code: PrintErrorCode;
  message: string;
  details?: any;
}

type PrintErrorCode = 
  | 'PRINTER_NOT_FOUND'
  | 'CONNECTION_FAILED'
  | 'PAPER_OUT'
  | 'PRINTER_OFFLINE'
  | 'UNKNOWN_ERROR';
```

### BIR Compliance Interfaces
```typescript
interface BIRSettings {
  enable_z_reading: boolean;
  enable_x_reading: boolean;
  enable_audit_logs: boolean;
  enable_e_journal: boolean;
  machine_accreditation: string;
  machine_serial: string;
  permit_number: string;
  date_issued: string;
  valid_until: string;
  auto_backup_frequency: BackupFrequency;
}

type BackupFrequency = 'daily' | 'weekly' | 'monthly';

interface ZReading {
  id: string;
  store_id: string;
  z_number: number; // Sequential number
  reading_date: string;
  start_time: string;
  end_time: string;
  transaction_count: number;
  gross_sales: number;
  vat_sales: number;
  vat_amount: number;
  non_vat_sales: number;
  vat_exempt: number;
  zero_rated: number;
  discount_amount: number;
  net_sales: number;
  payment_breakdown: PaymentBreakdown;
  user_id: string;
  created_at: string;
}

interface XReading {
  id: string;
  store_id: string;
  reading_date: string;
  reading_time: string;
  transaction_count: number;
  gross_sales: number;
  vat_sales: number;
  vat_amount: number;
  non_vat_sales: number;
  discount_amount: number;
  net_sales: number;
  payment_breakdown: PaymentBreakdown;
  user_id: string;
  created_at: string;
}

interface PaymentBreakdown {
  cash: number;
  card: number;
  gcash: number;
  paymaya: number;
  grab_pay: number;
  other: number;
}
```

## 🔌 Service Layer Interfaces

### POS Service Interfaces
```typescript
interface POSService {
  processTransaction(transaction: CreateTransactionRequest): Promise<Transaction>;
  voidTransaction(transactionId: string, reason: string): Promise<boolean>;
  applyDiscount(transactionId: string, discount: Discount): Promise<Transaction>;
  processPayment(transactionId: string, payment: PaymentDetails): Promise<PaymentResult>;
  printReceipt(transactionId: string, copies?: number): Promise<boolean>;
  generateZReading(storeId: string): Promise<ZReading>;
  generateXReading(storeId: string): Promise<XReading>;
}

interface CreateTransactionRequest {
  store_id: string;
  items: CreateTransactionItemRequest[];
  customer_id?: string;
  discount?: Discount;
  notes?: string;
}

interface CreateTransactionItemRequest {
  inventory_item_id?: string;
  recipe_id?: string;
  quantity: number;
  unit_price?: number; // Optional, will use item price if not provided
  discount?: Discount;
  notes?: string;
}

interface PaymentResult {
  success: boolean;
  transaction_id: string;
  payment_reference?: string;
  change_amount?: number;
  error_message?: string;
}
```

### Inventory Service Interfaces
```typescript
interface InventoryService {
  getStoreInventory(storeId: string, filters?: InventoryFilters): Promise<InventoryItem[]>;
  getCommissaryInventory(filters?: InventoryFilters): Promise<CommissaryItem[]>;
  updateStock(itemId: string, adjustment: StockAdjustment): Promise<boolean>;
  createInventoryItem(item: CreateInventoryItemRequest): Promise<InventoryItem>;
  updateInventoryItem(itemId: string, updates: UpdateInventoryItemRequest): Promise<InventoryItem>;
  deleteInventoryItem(itemId: string): Promise<boolean>;
  performConversion(conversion: ConversionRequest): Promise<ConversionResult>;
  getInventoryTransactions(filters: TransactionFilters): Promise<InventoryTransaction[]>;
  getLowStockItems(storeId: string): Promise<InventoryItem[]>;
}

interface InventoryFilters {
  category?: string;
  search_query?: string;
  is_active?: boolean;
  low_stock_only?: boolean;
  page?: number;
  limit?: number;
}

interface CreateInventoryItemRequest {
  store_id: string;
  name: string;
  description?: string;
  category: string;
  sku: string;
  barcode?: string;
  unit_of_measure: UnitOfMeasure;
  cost_price: number;
  selling_price: number;
  minimum_stock: number;
  maximum_stock?: number;
  reorder_point: number;
  commissary_item_id?: string;
}

interface UpdateInventoryItemRequest {
  name?: string;
  description?: string;
  category?: string;
  cost_price?: number;
  selling_price?: number;
  minimum_stock?: number;
  maximum_stock?: number;
  reorder_point?: number;
  is_active?: boolean;
}

interface TransactionFilters {
  store_id?: string;
  item_id?: string;
  transaction_type?: TransactionType;
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
}
```

### Recipe Service Interfaces
```typescript
interface RecipeService {
  getRecipes(storeId: string, filters?: RecipeFilters): Promise<Recipe[]>;
  getRecipe(recipeId: string): Promise<Recipe>;
  createRecipe(recipe: CreateRecipeRequest): Promise<Recipe>;
  updateRecipe(recipeId: string, updates: UpdateRecipeRequest): Promise<Recipe>;
  deleteRecipe(recipeId: string): Promise<boolean>;
  processRecipeUsage(recipeId: string, quantity: number, transactionId?: string): Promise<boolean>;
  calculateRecipeCost(recipeId: string): Promise<number>;
  getRecipeUsageLog(recipeId: string, filters?: UsageLogFilters): Promise<RecipeUsageLog[]>;
}

interface RecipeFilters {
  category?: string;
  search_query?: string;
  is_active?: boolean;
  page?: number;
  limit?: number;
}

interface CreateRecipeRequest {
  store_id: string;
  name: string;
  description?: string;
  category: string;
  serving_size: number;
  prep_time_minutes?: number;
  instructions?: string;
  selling_price?: number;
  ingredients: CreateRecipeIngredientRequest[];
}

interface CreateRecipeIngredientRequest {
  inventory_item_id: string;
  quantity_required: number;
  unit_of_measure: UnitOfMeasure;
  is_optional?: boolean;
  notes?: string;
}

interface UpdateRecipeRequest {
  name?: string;
  description?: string;
  category?: string;
  serving_size?: number;
  prep_time_minutes?: number;
  instructions?: string;
  selling_price?: number;
  is_active?: boolean;
  ingredients?: UpdateRecipeIngredientRequest[];
}

interface UpdateRecipeIngredientRequest {
  id?: string; // If updating existing ingredient
  inventory_item_id: string;
  quantity_required: number;
  unit_of_measure: UnitOfMeasure;
  is_optional?: boolean;
  notes?: string;
  _action?: 'create' | 'update' | 'delete'; // For batch operations
}

interface UsageLogFilters {
  start_date?: string;
  end_date?: string;
  transaction_id?: string;
  page?: number;
  limit?: number;
}
```

### Store Service Interfaces
```typescript
interface StoreService {
  getStores(filters?: StoreFilters): Promise<Store[]>;
  getStore(storeId: string): Promise<Store>;
  createStore(store: CreateStoreRequest): Promise<Store>;
  updateStore(storeId: string, updates: UpdateStoreRequest): Promise<Store>;
  deleteStore(storeId: string): Promise<boolean>;
  updateStoreSettings(storeId: string, settings: Partial<StoreSettings>): Promise<Store>;
  getStoreUsers(storeId: string): Promise<AppUser[]>;
  assignUserToStore(userId: string, storeId: string, role: UserRole): Promise<boolean>;
}

interface StoreFilters {
  is_active?: boolean;
  search_query?: string;
  page?: number;
  limit?: number;
}

interface CreateStoreRequest {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  tin?: string;
  business_permit?: string;
  machine_serial?: string;
  accreditation_number?: string;
  permit_number?: string;
  date_issued?: string;
  valid_until?: string;
  settings?: Partial<StoreSettings>;
}

interface UpdateStoreRequest {
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  tin?: string;
  business_permit?: string;
  machine_serial?: string;
  accreditation_number?: string;
  permit_number?: string;
  date_issued?: string;
  valid_until?: string;
  is_active?: boolean;
}
```

### Order Service Interfaces
```typescript
interface OrderService {
  getOrders(filters?: OrderFilters): Promise<Order[]>;
  getOrder(orderId: string): Promise<Order>;
  createOrder(order: CreateOrderRequest): Promise<Order>;
  updateOrder(orderId: string, updates: UpdateOrderRequest): Promise<Order>;
  deleteOrder(orderId: string): Promise<boolean>;
  sendOrderToSupplier(orderId: string): Promise<boolean>;
  receiveOrder(orderId: string, delivery: DeliveryReceiptRequest): Promise<Order>;
  cancelOrder(orderId: string, reason: string): Promise<Order>;
}

interface OrderFilters {
  supplier_id?: string;
  store_id?: string;
  status?: OrderStatus;
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
}

interface CreateOrderRequest {
  supplier_id: string;
  store_id?: string;
  order_date: string;
  expected_delivery?: string;
  notes?: string;
  items: CreateOrderItemRequest[];
}

interface CreateOrderItemRequest {
  commissary_item_id?: string;
  inventory_item_id?: string;
  quantity_ordered: number;
  unit_price: number;
  notes?: string;
}

interface UpdateOrderRequest {
  expected_delivery?: string;
  notes?: string;
  items?: UpdateOrderItemRequest[];
}

interface UpdateOrderItemRequest {
  id?: string; // If updating existing item
  commissary_item_id?: string;
  inventory_item_id?: string;
  quantity_ordered: number;
  unit_price: number;
  notes?: string;
  _action?: 'create' | 'update' | 'delete';
}

interface DeliveryReceiptRequest {
  delivery_number?: string;
  delivery_date: string;
  items: DeliveryItemRequest[];
  notes?: string;
}

interface DeliveryItemRequest {
  order_item_id: string;
  quantity_received: number;
  notes?: string;
}
```

## 🔌 Integration Interfaces

### Supabase Integration Interfaces
```typescript
interface SupabaseConfig {
  url: string;
  anon_key: string;
  service_role_key?: string;
}

interface SupabaseResponse<T> {
  data: T | null;
  error: SupabaseError | null;
  count?: number;
}

interface SupabaseError {
  message: string;
  details?: string;
  hint?: string;
  code?: string;
}

interface RealtimeSubscription {
  channel: string;
  event: RealtimeEvent;
  schema: string;
  table: string;
  filter?: string;
  callback: (payload: RealtimePayload) => void;
}

type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

interface RealtimePayload {
  eventType: RealtimeEvent;
  new?: any;
  old?: any;
  errors?: any[];
}
```

### Bluetooth Integration Interfaces
```typescript
interface BluetoothDevice {
  id: string;
  name: string;
  address: string;
  type: BluetoothDeviceType;
  is_connected: boolean;
  signal_strength?: number;
}

type BluetoothDeviceType = 'printer' | 'scanner' | 'scale' | 'other';

interface BluetoothService {
  scanForDevices(): Promise<BluetoothDevice[]>;
  connectToDevice(deviceId: string): Promise<boolean>;
  disconnectFromDevice(deviceId: string): Promise<boolean>;
  sendData(deviceId: string, data: Uint8Array): Promise<boolean>;
  isDeviceConnected(deviceId: string): Promise<boolean>;
  getConnectedDevices(): Promise<BluetoothDevice[]>;
}

interface BluetoothPrinterCommands {
  initialize: Uint8Array;
  cut_paper: Uint8Array;
  open_drawer: Uint8Array;
  align_left: Uint8Array;
  align_center: Uint8Array;
  align_right: Uint8Array;
  font_normal: Uint8Array;
  font_bold: Uint8Array;
  font_underline: Uint8Array;
  double_height: Uint8Array;
  double_width: Uint8Array;
  line_feed: Uint8Array;
}
```

### Camera/Scanner Integration Interfaces
```typescript
interface CameraService {
  startCamera(constraints?: MediaStreamConstraints): Promise<MediaStream>;
  stopCamera(): Promise<void>;
  captureImage(): Promise<Blob>;
  scanBarcode(): Promise<BarcodeResult>;
  isSupported(): boolean;
}

interface BarcodeResult {
  success: boolean;
  data?: string;
  format?: BarcodeFormat;
  error?: string;
}

type BarcodeFormat = 
  | 'CODE128' 
  | 'CODE39' 
  | 'EAN13' 
  | 'EAN8' 
  | 'UPC_A' 
  | 'UPC_E' 
  | 'QR_CODE' 
  | 'DATA_MATRIX';

interface ScannerConfig {
  formats: BarcodeFormat[];
  continuous_scan: boolean;
  beep_on_scan: boolean;
  vibrate_on_scan: boolean;
  torch_enabled: boolean;
}
```

## 📊 Analytics and Reporting Interfaces

### Report Interfaces
```typescript
interface SalesReport {
  store_id: string;
  period: ReportPeriod;
  start_date: string;
  end_date: string;
  total_transactions: number;
  total_sales: number;
  total_tax: number;
  total_discounts: number;
  net_sales: number;
  payment_breakdown: PaymentBreakdown;
  category_breakdown: CategorySalesBreakdown[];
  hourly_breakdown: HourlySalesBreakdown[];
  top_selling_items: TopSellingItem[];
}

interface ReportPeriod {
  type: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
  start_date: string;
  end_date: string;
}

interface CategorySalesBreakdown {
  category: string;
  quantity_sold: number;
  total_sales: number;
  percentage_of_total: number;
}

interface HourlySalesBreakdown {
  hour: number;
  transaction_count: number;
  total_sales: number;
}

interface TopSellingItem {
  item_id: string;
  item_name: string;
  quantity_sold: number;
  total_sales: number;
  rank: number;
}

interface InventoryReport {
  store_id: string;
  report_date: string;
  total_items: number;
  total_value: number;
  low_stock_items: LowStockItem[];
  category_breakdown: InventoryCategoryBreakdown[];
  movement_summary: InventoryMovementSummary[];
}

interface LowStockItem {
  item_id: string;
  item_name: string;
  current_quantity: number;
  minimum_stock: number;
  reorder_point: number;
  days_until_stockout: number;
}

interface InventoryCategoryBreakdown {
  category: string;
  item_count: number;
  total_quantity: number;
  total_value: number;
}

interface InventoryMovementSummary {
  transaction_type: TransactionType;
  transaction_count: number;
  total_quantity: number;
  total_value: number;
}
```

### Analytics Service Interfaces
```typescript
interface AnalyticsService {
  generateSalesReport(storeId: string, period: ReportPeriod): Promise<SalesReport>;
  generateInventoryReport(storeId: string): Promise<InventoryReport>;
  getDashboardMetrics(storeId: string): Promise<DashboardMetrics>;
  getPerformanceMetrics(storeId: string, period: ReportPeriod): Promise<PerformanceMetrics>;
  exportReport(reportType: ReportType, format: ExportFormat, filters: ReportFilters): Promise<Blob>;
}

interface DashboardMetrics {
  today_sales: number;
  today_transactions: number;
  low_stock_count: number;
  pending_orders: number;
  active_users: number;
  recent_transactions: Transaction[];
  sales_trend: SalesTrendData[];
  inventory_alerts: InventoryAlert[];
}

interface SalesTrendData {
  date: string;
  sales: number;
  transactions: number;
}

interface InventoryAlert {
  type: AlertType;
  item_id: string;
  item_name: string;
  current_quantity: number;
  threshold: number;
  severity: AlertSeverity;
}

type AlertType = 'low_stock' | 'out_of_stock' | 'overstock' | 'expiring';
type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

interface PerformanceMetrics {
  sales_growth: number; // Percentage
  transaction_growth: number;
  average_transaction_value: number;
  inventory_turnover: number;
  gross_margin: number;
  customer_satisfaction: number;
}

type ReportType = 'sales' | 'inventory' | 'financial' | 'performance';
type ExportFormat = 'pdf' | 'excel' | 'csv' | 'json';

interface ReportFilters {
  store_id?: string;
  start_date?: string;
  end_date?: string;
  category?: string;
  user_id?: string;
  [key: string]: any;
}
```

## 🎨 UI Component Prop Interfaces

### Common Component Props
```typescript
interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
  testId?: string;
}

interface LoadingProps extends BaseComponentProps {
  loading?: boolean;
  loadingText?: string;
  loadingComponent?: React.ReactNode;
}

interface ErrorProps extends BaseComponentProps {
  error?: Error | string | null;
  onRetry?: () => void;
  showDetails?: boolean;
}

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  showPageSizeSelector?: boolean;
}
```

### Form Component Props
```typescript
interface FormFieldProps extends BaseComponentProps {
  label?: string;
  required?: boolean;
  error?: string;
  helpText?: string;
  disabled?: boolean;
}

interface InputProps extends FormFieldProps {
  type?: 'text' | 'number' | 'email' | 'password' | 'tel' | 'url';
  value: string | number;
  onChange: (value: string | number) => void;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  pattern?: string;
  autoComplete?: string;
}

interface SelectProps extends FormFieldProps {
  value: string | number;
  onChange: (value: string | number) => void;
  options: SelectOption[];
  placeholder?: string;
  searchable?: boolean;
  multiple?: boolean;
}

interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
  group?: string;
}

interface CheckboxProps extends FormFieldProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  indeterminate?: boolean;
}

interface RadioGroupProps extends FormFieldProps {
  value: string | number;
  onChange: (value: string | number) => void;
  options: RadioOption[];
  direction?: 'horizontal' | 'vertical';
}

interface RadioOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}
```

### Data Display Component Props
```typescript
interface TableProps<T = any> extends BaseComponentProps, LoadingProps, ErrorProps {
  data: T[];
  columns: TableColumn<T>[];
  onRowClick?: (row: T, index: number) => void;
  onSort?: (column: string, direction: SortDirection) => void;
  sortColumn?: string;
  sortDirection?: SortDirection;
  selectable?: boolean;
  selectedRows?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
  pagination?: PaginationProps;
  emptyMessage?: string;
  stickyHeader?: boolean;
}

interface TableColumn<T = any> {
  key: string;
  title: string;
  dataIndex?: keyof T;
  render?: (value: any, record: T, index: number) => React.ReactNode;
  sortable?: boolean;
  width?: number | string;
  align?: 'left' | 'center' | 'right';
  fixed?: 'left' | 'right';
}

type SortDirection = 'asc' | 'desc';

interface CardProps extends BaseComponentProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  hoverable?: boolean;
  bordered?: boolean;
  size?: 'small' | 'default' | 'large';
}

interface BadgeProps extends BaseComponentProps {
  variant: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  size?: 'small' | 'default' | 'large';
  dot?: boolean;
  count?: number;
}
```

### Modal and Dialog Props
```typescript
interface ModalProps extends BaseComponentProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  size?: 'small' | 'medium' | 'large' | 'fullscreen';
  closable?: boolean;
  maskClosable?: boolean;
  footer?: React.ReactNode;
  centered?: boolean;
  destroyOnClose?: boolean;
}

interface ConfirmDialogProps extends BaseComponentProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'info' | 'warning' | 'error' | 'success';
  loading?: boolean;
}

interface DrawerProps extends BaseComponentProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  placement?: 'left' | 'right' | 'top' | 'bottom';
  width?: number | string;
  height?: number | string;
  maskClosable?: boolean;
  footer?: React.ReactNode;
}
```

## 🔧 Utility Type Definitions

### Generic Utility Types
```typescript
// API Response wrapper
type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
};

// Async operation state
type AsyncState<T> = {
  data: T | null;
  loading: boolean;
  error: Error | null;
};

// Form validation
type ValidationResult = {
  isValid: boolean;
  errors: Record<string, string>;
};

// Deep partial for update operations
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Omit multiple keys
type OmitMultiple<T, K extends keyof T> = Omit<T, K>;

// Pick multiple keys
type PickMultiple<T, K extends keyof T> = Pick<T, K>;

// Make specific fields required
type RequireFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

// Make specific fields optional
type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Extract array element type
type ArrayElement<T> = T extends (infer U)[] ? U : never;

// Function type helpers
type AsyncFunction<T extends any[], R> = (...args: T) => Promise<R>;
type EventHandler<T = any> = (event: T) => void;
type ValueChangeHandler<T> = (value: T) => void;
```

### Business Logic Types
```typescript
// Audit trail
interface AuditLog {
  id: string;
  table_name: string;
  record_id: string;
  action: AuditAction;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  user_id?: string;
  timestamp: string;
  ip_address?: string;
  user_agent?: string;
}

type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT';

// System configuration
interface SystemConfig {
  app_name: string;
  app_version: string;
  environment: 'development' | 'staging' | 'production';
  features: FeatureFlags;
  limits: SystemLimits;
  integrations: IntegrationConfig;
}

interface FeatureFlags {
  enable_bluetooth_printing: boolean;
  enable_barcode_scanning: boolean;
  enable_multi_store: boolean;
  enable_commissary: boolean;
  enable_recipes: boolean;
  enable_bir_compliance: boolean;
  enable_analytics: boolean;
}

interface SystemLimits {
  max_stores: number;
  max_users_per_store: number;
  max_inventory_items: number;
  max_transaction_items: number;
  max_file_upload_size: number; // in bytes
}

interface IntegrationConfig {
  supabase: SupabaseConfig;
  thermal_printer: PrinterConfig;
  payment_gateways: PaymentGatewayConfig[];
  email_service: EmailServiceConfig;
  sms_service: SMSServiceConfig;
}

interface PaymentGatewayConfig {
  provider: string;
  api_key: string;
  secret_key: string;
  webhook_url: string;
  enabled: boolean;
}

interface EmailServiceConfig {
  provider: 'resend' | 'sendgrid' | 'ses';
  api_key: string;
  from_email: string;
  from_name: string;
}

interface SMSServiceConfig {
  provider: 'twilio' | 'semaphore';
  api_key: string;
  sender_name: string;
}
```

### Error Handling Types
```typescript
// Application errors
abstract class AppError extends Error {
  abstract readonly statusCode: number;
  abstract readonly isOperational: boolean;
  
  constructor(message: string, public readonly context?: Record<string, any>) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  readonly statusCode = 400;
  readonly isOperational = true;
  
  constructor(message: string, public readonly field?: string, context?: Record<string, any>) {
    super(message, context);
  }
}

class NotFoundError extends AppError {
  readonly statusCode = 404;
  readonly isOperational = true;
}

class UnauthorizedError extends AppError {
  readonly statusCode = 401;
  readonly isOperational = true;
}

class ForbiddenError extends AppError {
  readonly statusCode = 403;
  readonly isOperational = true;
}

class ConflictError extends AppError {
  readonly statusCode = 409;
  readonly isOperational = true;
}

class InternalServerError extends AppError {
  readonly statusCode = 500;
  readonly isOperational = false;
}

// Error boundary state
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

// Global error handler
type ErrorHandler = (error: Error, context?: Record<string, any>) => void;
```

## 📚 Usage Examples and Best Practices

### Service Implementation Example
```typescript
// Example implementation of InventoryService
class InventoryServiceImpl implements InventoryService {
  constructor(private supabase: SupabaseClient) {}
  
  async getStoreInventory(storeId: string, filters?: InventoryFilters): Promise<InventoryItem[]> {
    let query = this.supabase
      .from('inventory_stock')
      .select('*')
      .eq('store_id', storeId)
      .eq('is_active', true);
    
    if (filters?.category) {
      query = query.eq('category', filters.category);
    }
    
    if (filters?.search_query) {
      query = query.or(`name.ilike.%${filters.search_query}%,sku.ilike.%${filters.search_query}%`);
    }
    
    if (filters?.low_stock_only) {
      query = query.lt('current_quantity', 'reorder_point');
    }
    
    const { data, error } = await query;
    
    if (error) {
      throw new Error(`Failed to fetch inventory: ${error.message}`);
    }
    
    return data || [];
  }
  
  async updateStock(itemId: string, adjustment: StockAdjustment): Promise<boolean> {
    const { error } = await this.supabase.rpc('update_inventory_stock', {
      p_item_id: itemId,
      p_quantity_change: adjustment.quantity_change,
      p_transaction_type: 'adjustment',
      p_notes: adjustment.notes
    });
    
    if (error) {
      throw new ValidationError(`Failed to update stock: ${error.message}`);
    }
    
    return true;
  }
}
```

### Component Props Usage Example
```typescript
// Example usage of TableProps
const InventoryTable: React.FC = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const columns: TableColumn<InventoryItem>[] = [
    {
      key: 'name',
      title: 'Item Name',
      dataIndex: 'name',
      sortable: true,
    },
    {
      key: 'current_quantity',
      title: 'Stock',
      dataIndex: 'current_quantity',
      render: (quantity: number, record: InventoryItem) => (
        <Badge 
          variant={quantity <= record.reorder_point ? 'danger' : 'success'}
          count={quantity}
        />
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (_, record: InventoryItem) => (
        <Button onClick={() => handleEdit(record.id)}>
          Edit
        </Button>
      ),
    },
  ];
  
  return (
    <Table
      data={inventory}
      columns={columns}
      loading={loading}
      error={error}
      onRowClick={(item) => console.log('Selected:', item)}
      pagination={{
        currentPage: 1,
        totalPages: 10,
        pageSize: 20,
        totalItems: 200,
        onPageChange: (page) => console.log('Page:', page),
      }}
    />
  );
};
```

### Type Safety Best Practices
```typescript
// Use discriminated unions for better type safety
type TransactionStatus = 'pending' | 'completed' | 'voided' | 'refunded';

interface BaseTransaction {
  id: string;
  store_id: string;
  total_amount: number;
}

interface PendingTransaction extends BaseTransaction {
  status: 'pending';
  payment_method?: never; // Not allowed for pending
}

interface CompletedTransaction extends BaseTransaction {
  status: 'completed';
  payment_method: PaymentMethod; // Required for completed
  completed_at: string;
}

type Transaction = PendingTransaction | CompletedTransaction;

// Type guards for runtime type checking
function isCompletedTransaction(transaction: Transaction): transaction is CompletedTransaction {
  return transaction.status === 'completed';
}

// Usage with type narrowing
function processTransaction(transaction: Transaction) {
  if (isCompletedTransaction(transaction)) {
    // TypeScript knows this is CompletedTransaction
    console.log('Payment method:', transaction.payment_method);
    console.log('Completed at:', transaction.completed_at);
  }
}
```

### Generic Interface Patterns
```typescript
// Generic repository pattern
interface Repository<T, CreateT = Omit<T, 'id' | 'created_at' | 'updated_at'>, UpdateT = Partial<CreateT>> {
  findById(id: string): Promise<T | null>;
  findAll(filters?: Record<string, any>): Promise<T[]>;
  create(data: CreateT): Promise<T>;
  update(id: string, data: UpdateT): Promise<T>;
  delete(id: string): Promise<boolean>;
}

// Specific repository implementations
type InventoryRepository = Repository<InventoryItem, CreateInventoryItemRequest, UpdateInventoryItemRequest>;
type StoreRepository = Repository<Store, CreateStoreRequest, UpdateStoreRequest>;

// Generic service response
interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: ServiceError;
  metadata?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}

interface ServiceError {
  code: string;
  message: string;
  details?: Record<string, any>;
}
```

---

This interface documentation provides a comprehensive guide to all TypeScript interfaces and types used throughout the Croffle Store POS system, ensuring type safety, consistency, and maintainability across the entire application.