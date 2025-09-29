# 🧩 Croffle Store POS - Component Documentation

## Overview

This document provides comprehensive documentation for all React components in the Croffle Store POS system, including their purpose, interfaces, usage patterns, and relationships.

## Component Architecture

### Component Hierarchy
```
App
├── Layout Components
│   ├── Header
│   ├── Sidebar
│   └── Footer
├── POS Components
│   ├── POSInterface
│   ├── ProductGrid
│   ├── Cart
│   ├── PaymentModal
│   └── ReceiptPrinter
├── Inventory Components
│   ├── InventoryDashboard
│   ├── StockManagement
│   ├── CommissaryInventory
│   └── ConversionManager
├── Admin Components
│   ├── AdminDashboard
│   ├── UserManagement
│   ├── StoreSettings
│   └── BIRCompliance
└── Shared Components
    ├── Modal
    ├── Button
    ├── Input
    └── DataTable
```

## 🛒 POS Interface Components

### POSInterface
**Purpose**: Main POS interface component that orchestrates the entire point-of-sale workflow.

**Location**: `src/components/pos/POSInterface.tsx`

**Props Interface**:
```typescript
interface POSInterfaceProps {
  storeId: string;
  userId: string;
  onTransactionComplete?: (transaction: Transaction) => void;
  enableBIRCompliance?: boolean;
  thermalPrinterEnabled?: boolean;
}
```

**Key Features**:
- Product selection and cart management
- Payment processing with multiple methods
- Receipt generation and printing
- BIR compliance integration
- Real-time inventory updates

**Usage Example**:
```typescript
import { POSInterface } from '@/components/pos/POSInterface';

function POSPage() {
  const handleTransactionComplete = (transaction: Transaction) => {
    console.log('Transaction completed:', transaction);
  };

  return (
    <POSInterface
      storeId="store-123"
      userId="user-456"
      onTransactionComplete={handleTransactionComplete}
      enableBIRCompliance={true}
      thermalPrinterEnabled={true}
    />
  );
}
```

**State Management**:
```typescript
interface POSState {
  cart: CartItem[];
  selectedProducts: Product[];
  paymentMethod: PaymentMethod;
  isProcessing: boolean;
  currentTransaction: Transaction | null;
}
```

### ProductGrid
**Purpose**: Displays available products in a grid layout for POS selection.

**Location**: `src/components/pos/ProductGrid.tsx`

**Props Interface**:
```typescript
interface ProductGridProps {
  products: Product[];
  onProductSelect: (product: Product) => void;
  categoryFilter?: string;
  searchQuery?: string;
  loading?: boolean;
  columns?: number;
}
```

**Usage Example**:
```typescript
<ProductGrid
  products={availableProducts}
  onProductSelect={handleProductSelect}
  categoryFilter="beverages"
  searchQuery={searchTerm}
  columns={4}
/>
```

### Cart
**Purpose**: Manages shopping cart items with quantity adjustments and modifications.

**Location**: `src/components/pos/Cart.tsx`

**Props Interface**:
```typescript
interface CartProps {
  items: CartItem[];
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemoveItem: (itemId: string) => void;
  onApplyDiscount: (discount: Discount) => void;
  subtotal: number;
  tax: number;
  total: number;
  editable?: boolean;
}
```

### PaymentModal
**Purpose**: Handles payment processing with multiple payment methods.

**Location**: `src/components/pos/PaymentModal.tsx`

**Props Interface**:
```typescript
interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  total: number;
  onPaymentComplete: (payment: PaymentDetails) => void;
  availablePaymentMethods: PaymentMethod[];
  enableSplitPayment?: boolean;
}
```

**Key Features**:
- Cash, card, and digital wallet payments
- Split payment support
- Change calculation
- Payment validation

### ReceiptPrinter
**Purpose**: Generates and prints receipts using thermal printers.

**Location**: `src/components/pos/ReceiptPrinter.tsx`

**Props Interface**:
```typescript
interface ReceiptPrinterProps {
  transaction: Transaction;
  storeInfo: StoreInfo;
  onPrintComplete?: () => void;
  onPrintError?: (error: Error) => void;
  copies?: number;
  format?: 'thermal' | 'standard';
}
```

**Integration Example**:
```typescript
import { ReceiptPrinter } from '@/components/pos/ReceiptPrinter';

<ReceiptPrinter
  transaction={completedTransaction}
  storeInfo={currentStore}
  onPrintComplete={() => console.log('Receipt printed')}
  copies={2}
  format="thermal"
/>
```

## 📦 Inventory Management Components

### InventoryDashboard
**Purpose**: Main dashboard for inventory overview and management.

**Location**: `src/components/inventory/InventoryDashboard.tsx`

**Props Interface**:
```typescript
interface InventoryDashboardProps {
  storeId: string;
  viewMode: 'store' | 'commissary' | 'both';
  onNavigateToDetail: (itemId: string) => void;
  refreshInterval?: number;
}
```

**Key Features**:
- Real-time stock levels
- Low stock alerts
- Quick actions (reorder, adjust)
- Search and filtering

### StockManagement
**Purpose**: Detailed stock management with adjustment capabilities.

**Location**: `src/components/inventory/StockManagement.tsx`

**Props Interface**:
```typescript
interface StockManagementProps {
  items: InventoryItem[];
  onStockAdjustment: (itemId: string, adjustment: StockAdjustment) => void;
  onBulkUpdate: (updates: BulkStockUpdate[]) => void;
  permissions: InventoryPermissions;
  showCommissaryLink?: boolean;
}
```

### CommissaryInventory
**Purpose**: Manages commissary-level inventory and raw materials.

**Location**: `src/components/inventory/CommissaryInventory.tsx`

**Props Interface**:
```typescript
interface CommissaryInventoryProps {
  commissaryId: string;
  onConversionRequest: (conversion: ConversionRequest) => void;
  onStockUpdate: (itemId: string, quantity: number) => void;
  linkedStores: Store[];
  showConversions?: boolean;
}
```

### ConversionManager
**Purpose**: Handles conversion of raw materials to finished goods.

**Location**: `src/components/inventory/ConversionManager.tsx`

**Props Interface**:
```typescript
interface ConversionManagerProps {
  conversions: ConversionRecipe[];
  onExecuteConversion: (conversionId: string, quantity: number) => void;
  availableRawMaterials: CommissaryItem[];
  targetStore: Store;
}
```

## 👨‍💼 Admin Dashboard Components

### AdminDashboard
**Purpose**: Main administrative interface with system overview.

**Location**: `src/components/admin/AdminDashboard.tsx`

**Props Interface**:
```typescript
interface AdminDashboardProps {
  userRole: UserRole;
  stores: Store[];
  onStoreSelect: (storeId: string) => void;
  dashboardConfig: DashboardConfig;
}
```

**Key Sections**:
- Sales analytics
- Inventory alerts
- User activity
- System health

### UserManagement
**Purpose**: Manages user accounts, roles, and permissions.

**Location**: `src/components/admin/UserManagement.tsx`

**Props Interface**:
```typescript
interface UserManagementProps {
  users: AppUser[];
  onCreateUser: (userData: CreateUserRequest) => void;
  onUpdateUser: (userId: string, updates: UserUpdate) => void;
  onDeleteUser: (userId: string) => void;
  availableRoles: UserRole[];
  storeAssignments: StoreAssignment[];
}
```

### StoreSettings
**Purpose**: Configuration interface for store-specific settings.

**Location**: `src/components/admin/StoreSettings.tsx`

**Props Interface**:
```typescript
interface StoreSettingsProps {
  store: Store;
  onUpdateSettings: (settings: StoreSettings) => void;
  onSave: () => void;
  isDirty: boolean;
  validationErrors?: ValidationError[];
}
```

### BIRCompliance
**Purpose**: BIR compliance configuration and monitoring.

**Location**: `src/components/admin/BIRCompliance.tsx`

**Props Interface**:
```typescript
interface BIRComplianceProps {
  storeId: string;
  complianceSettings: BIRSettings;
  onUpdateSettings: (settings: BIRSettings) => void;
  onGenerateZReading: () => void;
  onGenerateXReading: () => void;
  lastZReading?: ZReading;
}
```

**Key Features**:
- Z-Reading and X-Reading generation
- BIR settings configuration
- Compliance status monitoring
- Audit trail access

## 🖨️ Thermal Printing Components

### ThermalPrinter
**Purpose**: Core thermal printer integration component.

**Location**: `src/components/printing/ThermalPrinter.tsx`

**Props Interface**:
```typescript
interface ThermalPrinterProps {
  content: PrintContent;
  printerConfig: PrinterConfig;
  onPrintStart?: () => void;
  onPrintComplete?: () => void;
  onPrintError?: (error: PrintError) => void;
  autoConnect?: boolean;
}
```

**Usage Example**:
```typescript
import { ThermalPrinter } from '@/components/printing/ThermalPrinter';

const printConfig: PrinterConfig = {
  width: 58, // mm
  fontSize: 12,
  alignment: 'center',
  cutPaper: true
};

<ThermalPrinter
  content={receiptContent}
  printerConfig={printConfig}
  onPrintComplete={() => setIsPrinting(false)}
  autoConnect={true}
/>
```

### PrintPreview
**Purpose**: Shows print preview before sending to thermal printer.

**Location**: `src/components/printing/PrintPreview.tsx`

**Props Interface**:
```typescript
interface PrintPreviewProps {
  content: PrintContent;
  format: PrintFormat;
  onPrint: () => void;
  onCancel: () => void;
  showControls?: boolean;
}
```

## 🔧 Shared Components

### Modal
**Purpose**: Reusable modal component with consistent styling.

**Location**: `src/components/shared/Modal.tsx`

**Props Interface**:
```typescript
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
  closeOnOverlayClick?: boolean;
  showCloseButton?: boolean;
}
```

### Button
**Purpose**: Standardized button component with variants.

**Location**: `src/components/shared/Button.tsx`

**Props Interface**:
```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant: 'primary' | 'secondary' | 'danger' | 'success' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}
```

### DataTable
**Purpose**: Feature-rich data table with sorting, filtering, and pagination.

**Location**: `src/components/shared/DataTable.tsx`

**Props Interface**:
```typescript
interface DataTableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  onSort?: (column: string, direction: 'asc' | 'desc') => void;
  onFilter?: (filters: TableFilter[]) => void;
  onRowClick?: (row: T) => void;
  pagination?: PaginationConfig;
  loading?: boolean;
  emptyMessage?: string;
}
```

## 🔄 State Management Patterns

### Context Providers

#### POSContext
```typescript
interface POSContextValue {
  currentTransaction: Transaction | null;
  cart: CartItem[];
  addToCart: (product: Product, quantity: number) => void;
  removeFromCart: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  processPayment: (payment: PaymentDetails) => Promise<Transaction>;
  clearCart: () => void;
}
```

#### InventoryContext
```typescript
interface InventoryContextValue {
  storeInventory: InventoryItem[];
  commissaryInventory: CommissaryItem[];
  updateStock: (itemId: string, quantity: number) => Promise<void>;
  performConversion: (conversion: ConversionRequest) => Promise<void>;
  refreshInventory: () => Promise<void>;
}
```

### Custom Hooks

#### usePOS
```typescript
function usePOS(storeId: string) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const addToCart = useCallback((product: Product, quantity: number) => {
    // Implementation
  }, []);
  
  return {
    cart,
    addToCart,
    processPayment,
    isProcessing
  };
}
```

#### useInventory
```typescript
function useInventory(storeId: string) {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  const updateStock = useCallback(async (itemId: string, quantity: number) => {
    // Implementation
  }, []);
  
  return {
    inventory,
    loading,
    updateStock,
    refreshInventory
  };
}
```

## 🎨 Styling Patterns

### Component Styling
- **Tailwind CSS**: Primary styling framework
- **CSS Modules**: Component-specific styles
- **Styled Components**: Dynamic styling when needed

### Theme Configuration
```typescript
const theme = {
  colors: {
    primary: '#8B4513',    // Croffle brown
    secondary: '#D2691E',  // Light brown
    accent: '#F4A460',     // Sandy brown
    success: '#10B981',
    danger: '#EF4444',
    warning: '#F59E0B'
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem'
  }
};
```

## 🔍 Error Handling

### Error Boundary
```typescript
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ComponentErrorBoundary extends React.Component<
  React.PropsWithChildren<{}>,
  ErrorBoundaryState
> {
  // Implementation
}
```

### Error Display Components
```typescript
interface ErrorMessageProps {
  error: Error | string;
  onRetry?: () => void;
  showDetails?: boolean;
}
```

## 📱 Responsive Design

### Breakpoint System
```typescript
const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px'
};
```

### Mobile-First Approach
- Components designed for mobile first
- Progressive enhancement for larger screens
- Touch-friendly interfaces for POS hardware

## 🧪 Testing Patterns

### Component Testing
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { POSInterface } from '../POSInterface';

describe('POSInterface', () => {
  it('should add product to cart', () => {
    render(<POSInterface storeId="test" userId="test" />);
    
    const product = screen.getByTestId('product-1');
    fireEvent.click(product);
    
    expect(screen.getByText('1 item in cart')).toBeInTheDocument();
  });
});
```

## 📚 Best Practices

### Component Design
1. **Single Responsibility**: Each component has one clear purpose
2. **Composition over Inheritance**: Use composition patterns
3. **Props Interface**: Always define TypeScript interfaces
4. **Error Boundaries**: Wrap components in error boundaries
5. **Accessibility**: Include ARIA labels and keyboard navigation

### Performance Optimization
1. **React.memo**: Memoize expensive components
2. **useCallback**: Memoize event handlers
3. **useMemo**: Memoize expensive calculations
4. **Code Splitting**: Lazy load components
5. **Virtual Scrolling**: For large data sets

### Code Organization
1. **Feature-based Structure**: Group by business feature
2. **Shared Components**: Reusable UI components
3. **Custom Hooks**: Extract business logic
4. **Type Definitions**: Centralized interfaces
5. **Constants**: Shared configuration values

---

This component documentation provides a comprehensive guide to all React components in the Croffle Store POS system, including their interfaces, usage patterns, and relationships.