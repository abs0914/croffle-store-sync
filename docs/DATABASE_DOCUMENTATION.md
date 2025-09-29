# 🗄️ Croffle Store POS - Database Documentation

## Overview

This document provides comprehensive documentation for the Croffle Store POS database architecture, built on Supabase (PostgreSQL) with Row Level Security (RLS) and real-time capabilities.

## Database Architecture

### Three-Tier Data Model
```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                       │
│                   (React Components)                        │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                   BUSINESS LOGIC LAYER                      │
│                   (Services & APIs)                         │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                     DATA LAYER                              │
│              (Supabase PostgreSQL)                          │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │   Store     │ │ Inventory   │ │   Orders    │           │
│  │ Management  │ │ Management  │ │ Management  │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

## 🏪 Core Tables

### stores
**Purpose**: Store locations and configurations

```sql
CREATE TABLE stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  address TEXT,
  phone VARCHAR(50),
  email VARCHAR(255),
  tin VARCHAR(50),
  business_permit VARCHAR(100),
  machine_serial VARCHAR(100),
  accreditation_number VARCHAR(100),
  permit_number VARCHAR(100),
  date_issued DATE,
  valid_until DATE,
  is_active BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_stores_active ON stores(is_active);
CREATE INDEX idx_stores_tin ON stores(tin);
```

**Key Relationships**:
- One-to-many with `app_users`
- One-to-many with `inventory_stock`
- One-to-many with `orders`

**RLS Policy**:
```sql
-- Users can only access stores they're assigned to
CREATE POLICY "Users can access assigned stores" ON stores
  FOR ALL USING (
    id IN (
      SELECT store_id FROM app_users 
      WHERE user_id = auth.uid()
    )
  );
```

### app_users
**Purpose**: User management with role-based access

```sql
CREATE TABLE app_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'owner', 'manager', 'staff')),
  permissions JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, store_id)
);

-- Indexes
CREATE INDEX idx_app_users_store ON app_users(store_id);
CREATE INDEX idx_app_users_role ON app_users(role);
CREATE INDEX idx_app_users_active ON app_users(is_active);
```

**Role Hierarchy**:
- `admin`: System-wide access
- `owner`: Multi-store access
- `manager`: Store-level management
- `staff`: Limited POS access

## 📦 Inventory Management Tables

### inventory_stock (Store-Level Inventory)
**Purpose**: Store-specific inventory items and stock levels

```sql
CREATE TABLE inventory_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  sku VARCHAR(100),
  barcode VARCHAR(100),
  unit_of_measure VARCHAR(50) NOT NULL,
  cost_price DECIMAL(10,2),
  selling_price DECIMAL(10,2),
  current_quantity DECIMAL(10,3) DEFAULT 0,
  minimum_stock DECIMAL(10,3) DEFAULT 0,
  maximum_stock DECIMAL(10,3),
  reorder_point DECIMAL(10,3),
  is_active BOOLEAN DEFAULT true,
  is_recipe_item BOOLEAN DEFAULT false,
  commissary_item_id UUID REFERENCES commissary_inventory(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(store_id, sku)
);

-- Indexes
CREATE INDEX idx_inventory_stock_store ON inventory_stock(store_id);
CREATE INDEX idx_inventory_stock_category ON inventory_stock(category);
CREATE INDEX idx_inventory_stock_sku ON inventory_stock(sku);
CREATE INDEX idx_inventory_stock_barcode ON inventory_stock(barcode);
CREATE INDEX idx_inventory_stock_low_stock ON inventory_stock(store_id, current_quantity, minimum_stock);
```

**Key Features**:
- Multi-unit support (pieces, kg, liters, etc.)
- Low stock alerts via `reorder_point`
- Recipe item flagging
- Commissary linkage

### commissary_inventory (Commissary-Level Inventory)
**Purpose**: Central raw materials and supplies management

```sql
CREATE TABLE commissary_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  sku VARCHAR(100) UNIQUE,
  unit_of_measure VARCHAR(50) NOT NULL,
  cost_price DECIMAL(10,2),
  current_quantity DECIMAL(10,3) DEFAULT 0,
  minimum_stock DECIMAL(10,3) DEFAULT 0,
  supplier_id UUID REFERENCES suppliers(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_commissary_inventory_category ON commissary_inventory(category);
CREATE INDEX idx_commissary_inventory_sku ON commissary_inventory(sku);
CREATE INDEX idx_commissary_inventory_supplier ON commissary_inventory(supplier_id);
CREATE INDEX idx_commissary_inventory_low_stock ON commissary_inventory(current_quantity, minimum_stock);
```

### inventory_transactions
**Purpose**: Complete audit trail of all inventory movements

```sql
CREATE TABLE inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  inventory_item_id UUID REFERENCES inventory_stock(id) ON DELETE CASCADE,
  commissary_item_id UUID REFERENCES commissary_inventory(id),
  transaction_type VARCHAR(50) NOT NULL CHECK (
    transaction_type IN (
      'sale', 'purchase', 'adjustment', 'transfer', 
      'conversion', 'waste', 'return', 'recipe_usage'
    )
  ),
  quantity_change DECIMAL(10,3) NOT NULL,
  unit_cost DECIMAL(10,2),
  total_cost DECIMAL(10,2),
  reference_id UUID, -- Links to orders, sales, etc.
  reference_type VARCHAR(50),
  notes TEXT,
  user_id UUID REFERENCES app_users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_inventory_transactions_store ON inventory_transactions(store_id);
CREATE INDEX idx_inventory_transactions_item ON inventory_transactions(inventory_item_id);
CREATE INDEX idx_inventory_transactions_type ON inventory_transactions(transaction_type);
CREATE INDEX idx_inventory_transactions_date ON inventory_transactions(created_at);
CREATE INDEX idx_inventory_transactions_reference ON inventory_transactions(reference_id, reference_type);
```

**Transaction Types**:
- `sale`: POS sales deduction
- `purchase`: Stock received from suppliers
- `adjustment`: Manual stock corrections
- `transfer`: Inter-store transfers
- `conversion`: Raw material to finished goods
- `waste`: Spoilage or damage
- `return`: Customer returns
- `recipe_usage`: Recipe-based deductions

### inventory_conversions
**Purpose**: Tracks raw material to finished goods conversions

```sql
CREATE TABLE inventory_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  commissary_item_id UUID REFERENCES commissary_inventory(id) NOT NULL,
  store_item_id UUID REFERENCES inventory_stock(id) NOT NULL,
  conversion_ratio DECIMAL(10,4) NOT NULL, -- How much commissary item per store item
  unit_cost DECIMAL(10,2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(store_id, commissary_item_id, store_item_id)
);

-- Indexes
CREATE INDEX idx_inventory_conversions_store ON inventory_conversions(store_id);
CREATE INDEX idx_inventory_conversions_commissary ON inventory_conversions(commissary_item_id);
CREATE INDEX idx_inventory_conversions_store_item ON inventory_conversions(store_item_id);
```

## 🍳 Recipe System Tables

### recipes
**Purpose**: Product recipes with ingredients and instructions

```sql
CREATE TABLE recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  serving_size DECIMAL(10,3) DEFAULT 1,
  prep_time_minutes INTEGER,
  instructions TEXT,
  cost_per_serving DECIMAL(10,2),
  selling_price DECIMAL(10,2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_recipes_store ON recipes(store_id);
CREATE INDEX idx_recipes_category ON recipes(category);
CREATE INDEX idx_recipes_active ON recipes(is_active);
```

### recipe_ingredients
**Purpose**: Links recipes to inventory items with quantities

```sql
CREATE TABLE recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE NOT NULL,
  inventory_item_id UUID REFERENCES inventory_stock(id) ON DELETE CASCADE NOT NULL,
  quantity_required DECIMAL(10,4) NOT NULL,
  unit_of_measure VARCHAR(50) NOT NULL,
  cost_per_unit DECIMAL(10,2),
  is_optional BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(recipe_id, inventory_item_id)
);

-- Indexes
CREATE INDEX idx_recipe_ingredients_recipe ON recipe_ingredients(recipe_id);
CREATE INDEX idx_recipe_ingredients_item ON recipe_ingredients(inventory_item_id);
```

### recipe_usage_log
**Purpose**: Tracks recipe usage in POS transactions

```sql
CREATE TABLE recipe_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE NOT NULL,
  transaction_id UUID, -- Links to POS transaction
  quantity_used DECIMAL(10,3) NOT NULL,
  total_cost DECIMAL(10,2),
  user_id UUID REFERENCES app_users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_recipe_usage_recipe ON recipe_usage_log(recipe_id);
CREATE INDEX idx_recipe_usage_transaction ON recipe_usage_log(transaction_id);
CREATE INDEX idx_recipe_usage_date ON recipe_usage_log(created_at);
```

## 🛒 Order Management Tables

### suppliers
**Purpose**: Vendor and supplier information

```sql
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  tin VARCHAR(50),
  payment_terms VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_suppliers_active ON suppliers(is_active);
CREATE INDEX idx_suppliers_name ON suppliers(name);
```

### orders
**Purpose**: Purchase orders to suppliers

```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number VARCHAR(100) UNIQUE NOT NULL,
  supplier_id UUID REFERENCES suppliers(id) NOT NULL,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'draft' CHECK (
    status IN ('draft', 'sent', 'confirmed', 'partial', 'completed', 'cancelled')
  ),
  order_date DATE NOT NULL,
  expected_delivery DATE,
  subtotal DECIMAL(12,2) DEFAULT 0,
  tax_amount DECIMAL(12,2) DEFAULT 0,
  total_amount DECIMAL(12,2) DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES app_users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_orders_supplier ON orders(supplier_id);
CREATE INDEX idx_orders_store ON orders(store_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_date ON orders(order_date);
CREATE INDEX idx_orders_number ON orders(order_number);
```

### order_items
**Purpose**: Individual items in purchase orders

```sql
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  commissary_item_id UUID REFERENCES commissary_inventory(id),
  inventory_item_id UUID REFERENCES inventory_stock(id),
  quantity_ordered DECIMAL(10,3) NOT NULL,
  quantity_received DECIMAL(10,3) DEFAULT 0,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(12,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_commissary ON order_items(commissary_item_id);
CREATE INDEX idx_order_items_inventory ON order_items(inventory_item_id);
```

### delivery_orders
**Purpose**: Delivery tracking and goods receipt

```sql
CREATE TABLE delivery_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  delivery_number VARCHAR(100),
  delivery_date DATE,
  received_by UUID REFERENCES app_users(id),
  status VARCHAR(50) DEFAULT 'pending' CHECK (
    status IN ('pending', 'partial', 'completed', 'rejected')
  ),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_delivery_orders_order ON delivery_orders(order_id);
CREATE INDEX idx_delivery_orders_status ON delivery_orders(status);
CREATE INDEX idx_delivery_orders_date ON delivery_orders(delivery_date);
```

## 🔄 Conversion System Tables

### conversion_recipes
**Purpose**: Templates for converting raw materials to finished goods

```sql
CREATE TABLE conversion_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  output_item_id UUID REFERENCES inventory_stock(id) NOT NULL,
  output_quantity DECIMAL(10,3) NOT NULL,
  estimated_cost DECIMAL(10,2),
  prep_time_minutes INTEGER,
  instructions TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_conversion_recipes_output ON conversion_recipes(output_item_id);
CREATE INDEX idx_conversion_recipes_active ON conversion_recipes(is_active);
```

### conversion_recipe_ingredients
**Purpose**: Ingredients required for conversion recipes

```sql
CREATE TABLE conversion_recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversion_recipe_id UUID REFERENCES conversion_recipes(id) ON DELETE CASCADE NOT NULL,
  commissary_item_id UUID REFERENCES commissary_inventory(id) NOT NULL,
  quantity_required DECIMAL(10,4) NOT NULL,
  unit_of_measure VARCHAR(50) NOT NULL,
  cost_per_unit DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(conversion_recipe_id, commissary_item_id)
);

-- Indexes
CREATE INDEX idx_conversion_ingredients_recipe ON conversion_recipe_ingredients(conversion_recipe_id);
CREATE INDEX idx_conversion_ingredients_commissary ON conversion_recipe_ingredients(commissary_item_id);
```

## 🔐 Security & RLS Policies

### Row Level Security (RLS) Implementation

#### Store-Based Access Control
```sql
-- Enable RLS on all tables
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE commissary_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Store access policy
CREATE POLICY "Store access control" ON inventory_stock
  FOR ALL USING (
    store_id IN (
      SELECT store_id FROM app_users 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );
```

#### Role-Based Permissions
```sql
-- Admin access to all data
CREATE POLICY "Admin full access" ON commissary_inventory
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM app_users 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Manager access to store data
CREATE POLICY "Manager store access" ON orders
  FOR ALL USING (
    store_id IN (
      SELECT store_id FROM app_users 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'owner', 'manager')
    )
  );
```

### Database Functions

#### Update Stock Function
```sql
CREATE OR REPLACE FUNCTION update_inventory_stock(
  p_item_id UUID,
  p_quantity_change DECIMAL,
  p_transaction_type VARCHAR,
  p_reference_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_quantity DECIMAL;
  v_store_id UUID;
BEGIN
  -- Get current stock and store
  SELECT current_quantity, store_id 
  INTO v_current_quantity, v_store_id
  FROM inventory_stock 
  WHERE id = p_item_id;
  
  -- Check if sufficient stock for negative changes
  IF p_quantity_change < 0 AND v_current_quantity + p_quantity_change < 0 THEN
    RAISE EXCEPTION 'Insufficient stock. Current: %, Requested: %', 
      v_current_quantity, ABS(p_quantity_change);
  END IF;
  
  -- Update stock
  UPDATE inventory_stock 
  SET 
    current_quantity = current_quantity + p_quantity_change,
    updated_at = NOW()
  WHERE id = p_item_id;
  
  -- Log transaction
  INSERT INTO inventory_transactions (
    store_id, inventory_item_id, transaction_type,
    quantity_change, reference_id, notes, user_id
  ) VALUES (
    v_store_id, p_item_id, p_transaction_type,
    p_quantity_change, p_reference_id, p_notes, auth.uid()
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### Recipe Processing Function
```sql
CREATE OR REPLACE FUNCTION process_recipe_usage(
  p_recipe_id UUID,
  p_quantity DECIMAL,
  p_transaction_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  r_ingredient RECORD;
  v_total_cost DECIMAL := 0;
BEGIN
  -- Process each ingredient
  FOR r_ingredient IN 
    SELECT ri.inventory_item_id, ri.quantity_required, ri.cost_per_unit,
           inv.current_quantity
    FROM recipe_ingredients ri
    JOIN inventory_stock inv ON ri.inventory_item_id = inv.id
    WHERE ri.recipe_id = p_recipe_id
  LOOP
    -- Check stock availability
    IF r_ingredient.current_quantity < (r_ingredient.quantity_required * p_quantity) THEN
      RAISE EXCEPTION 'Insufficient stock for ingredient %', r_ingredient.inventory_item_id;
    END IF;
    
    -- Deduct stock
    PERFORM update_inventory_stock(
      r_ingredient.inventory_item_id,
      -(r_ingredient.quantity_required * p_quantity),
      'recipe_usage',
      p_transaction_id,
      'Recipe usage: ' || p_recipe_id::TEXT
    );
    
    -- Calculate cost
    v_total_cost := v_total_cost + (r_ingredient.cost_per_unit * r_ingredient.quantity_required * p_quantity);
  END LOOP;
  
  -- Log recipe usage
  INSERT INTO recipe_usage_log (recipe_id, transaction_id, quantity_used, total_cost, user_id)
  VALUES (p_recipe_id, p_transaction_id, p_quantity, v_total_cost, auth.uid());
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Database Triggers

#### Auto-update timestamps
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_stores_updated_at 
  BEFORE UPDATE ON stores 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_stock_updated_at 
  BEFORE UPDATE ON inventory_stock 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

#### Low stock alerts
```sql
CREATE OR REPLACE FUNCTION check_low_stock()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if stock fell below reorder point
  IF NEW.current_quantity <= NEW.reorder_point AND 
     OLD.current_quantity > OLD.reorder_point THEN
    
    -- Insert notification or trigger alert
    INSERT INTO notifications (
      store_id, type, title, message, data, created_at
    ) VALUES (
      NEW.store_id, 'low_stock', 'Low Stock Alert',
      'Item ' || NEW.name || ' is below reorder point',
      jsonb_build_object('item_id', NEW.id, 'current_stock', NEW.current_quantity),
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER low_stock_alert
  AFTER UPDATE ON inventory_stock
  FOR EACH ROW EXECUTE FUNCTION check_low_stock();
```

## 📊 Data Flow Patterns

### POS Transaction Flow
```
1. Product Selection → inventory_stock (check availability)
2. Recipe Processing → recipe_ingredients (get requirements)
3. Stock Deduction → update_inventory_stock() function
4. Commissary Update → inventory_conversions (calculate deductions)
5. Transaction Log → inventory_transactions (audit trail)
```

### Inventory Conversion Flow
```
1. Conversion Request → conversion_recipes (get template)
2. Raw Material Check → commissary_inventory (verify stock)
3. Conversion Process → conversion_recipe_ingredients (deduct materials)
4. Finished Goods Update → inventory_stock (add products)
5. Transaction Logging → inventory_transactions (record conversion)
```

### Order Processing Flow
```
1. Order Creation → orders (new purchase order)
2. Item Addition → order_items (specify quantities)
3. Supplier Confirmation → orders.status = 'confirmed'
4. Delivery Receipt → delivery_orders (track delivery)
5. Stock Update → commissary_inventory/inventory_stock (receive goods)
```

## 🔍 Query Optimization

### Strategic Indexes
```sql
-- Composite indexes for common queries
CREATE INDEX idx_inventory_stock_store_category ON inventory_stock(store_id, category);
CREATE INDEX idx_inventory_transactions_store_date ON inventory_transactions(store_id, created_at);
CREATE INDEX idx_orders_store_status_date ON orders(store_id, status, order_date);

-- Partial indexes for active records
CREATE INDEX idx_active_inventory ON inventory_stock(store_id) WHERE is_active = true;
CREATE INDEX idx_active_recipes ON recipes(store_id) WHERE is_active = true;
```

### Query Performance Tips
1. **Use appropriate indexes** for frequently queried columns
2. **Limit result sets** with proper WHERE clauses
3. **Use EXPLAIN ANALYZE** to optimize slow queries
4. **Consider materialized views** for complex aggregations
5. **Implement pagination** for large datasets

## 🔄 Real-time Subscriptions

### Supabase Real-time Configuration
```sql
-- Enable real-time for critical tables
ALTER PUBLICATION supabase_realtime ADD TABLE inventory_stock;
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE inventory_transactions;
```

### Client-side Subscriptions
```typescript
// Real-time inventory updates
const subscription = supabase
  .channel('inventory-changes')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'inventory_stock' },
    (payload) => {
      console.log('Inventory updated:', payload);
      // Update local state
    }
  )
  .subscribe();
```

## 📈 Performance Monitoring

### Key Metrics to Monitor
- Query execution times
- Index usage statistics
- Connection pool utilization
- Real-time subscription load
- Storage growth patterns

### Maintenance Tasks
```sql
-- Regular maintenance queries
ANALYZE; -- Update table statistics
VACUUM; -- Reclaim storage space
REINDEX; -- Rebuild indexes if needed
```

---

This database documentation provides a comprehensive guide to the Croffle Store POS database architecture, including schema design, relationships, security policies, and optimization strategies.