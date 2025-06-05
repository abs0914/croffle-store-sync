# Two-Tier Inventory Management System

## Overview

The Croffle Store Sync application now implements a comprehensive two-tier inventory management system that separates raw materials from finished goods, providing better control and traceability throughout the supply chain.

## System Architecture

### Tier 1: Commissary Inventory (Admin-Level)
- **Purpose**: Manages raw materials and supplies at the commissary/warehouse level
- **Access**: Admin and Owner roles only
- **Location**: Centralized inventory managed by administrators
- **Contents**: Raw materials, packaging materials, and supplies that need processing

### Tier 2: Store Inventory Stocks (Store-Level)
- **Purpose**: Manages finished ingredients ready for use in menu items
- **Access**: All authenticated users (with store-based restrictions)
- **Location**: Individual store locations
- **Contents**: Processed ingredients, finished goods, and supplies ready for immediate use

## Key Features

### 1. **Commissary Inventory Management**
- **Admin-only access** for managing raw materials
- **Centralized control** of procurement and stock levels
- **Supplier management** integration
- **Cost tracking** and inventory valuation
- **Storage location** tracking
- **Expiry date** management

### 2. **Store Inventory Stocks**
- **Store-specific inventory** for each location
- **Ready-to-use ingredients** for menu preparation
- **Recipe integration** - only store inventory can be used in recipes
- **Order management** - orders can only be placed for store inventory items
- **Stock level monitoring** and alerts

### 3. **Inventory Conversion System**
- **Raw material to finished goods** conversion process
- **Conversion ratio tracking** for cost analysis
- **Audit trail** for all conversions
- **Batch processing** capabilities
- **Notes and documentation** for each conversion

### 4. **Access Control & Security**
- **Role-based access control** (RBAC)
- **Row-level security** (RLS) policies
- **Store-based data isolation**
- **Admin-only commissary access**

## Database Schema

### New Tables Added

#### `commissary_inventory`
```sql
- id (uuid, primary key)
- name (text, required)
- category (text: raw_materials, packaging_materials, supplies)
- current_stock (numeric)
- minimum_threshold (numeric)
- unit (text)
- unit_cost (numeric)
- supplier_id (uuid, foreign key)
- sku (text)
- barcode (text)
- expiry_date (date)
- storage_location (text)
- is_active (boolean)
- created_at, updated_at (timestamps)
```

#### `inventory_conversions`
```sql
- id (uuid, primary key)
- commissary_item_id (uuid, foreign key)
- store_id (uuid, foreign key)
- inventory_stock_id (uuid, foreign key)
- raw_material_quantity (numeric)
- finished_goods_quantity (numeric)
- conversion_ratio (numeric)
- conversion_date (timestamp)
- converted_by (text)
- notes (text)
- created_at (timestamp)
```

#### Supporting Tables
- `suppliers` - Supplier information and contact details
- `inventory_items` - Enhanced inventory management
- `recipes` - Recipe definitions linking to store inventory
- `recipe_ingredients` - Recipe ingredient specifications
- `orders`, `order_items` - Order management system
- `purchase_orders`, `purchase_order_items` - Purchase order workflow
- `delivery_orders` - Delivery tracking
- `goods_received_notes` - Goods receipt documentation

## User Interface Components

### 1. **Commissary Inventory Page** (`/commissary-inventory`)
- **Admin-only access** with role verification
- **Comprehensive filtering** by category, stock level, supplier
- **Add/Edit/Delete** commissary inventory items
- **Stock level indicators** (good, low, out of stock)
- **Supplier integration** for procurement

### 2. **Inventory Conversion Page** (`/inventory-conversion`)
- **Admin-only access** for conversion operations
- **Real-time conversion** from raw materials to finished goods
- **Conversion history** and audit trail
- **Create new store items** during conversion
- **Conversion ratio calculation** and tracking

### 3. **Enhanced Store Inventory** (`/inventory/stock`)
- **Clear labeling** as store-level inventory
- **Integration with menu management**
- **Order placement** restricted to store inventory
- **Multi-store support** with proper isolation

### 4. **Updated Navigation**
- **Commissary Inventory** menu item (admin-only)
- **Inventory Conversion** menu item (admin-only)
- **Clear separation** of admin vs store functions

## Integration Points

### Menu Management Integration
- **Recipes use only store inventory** - Raw materials cannot be directly used in recipes
- **Ingredient selection** limited to store's inventory stocks
- **Recipe costing** based on store inventory costs
- **Menu item availability** tied to store inventory levels

### Order Management Integration
- **Purchase orders** can only include store inventory items
- **No direct ordering** of commissary items by stores
- **Supplier integration** through commissary management
- **Delivery tracking** and goods receipt notes

## Access Control Matrix

| Role | Commissary Inventory | Store Inventory | Conversions | Menu Management | Order Management |
|------|---------------------|-----------------|-------------|-----------------|------------------|
| Admin | Full Access | Full Access | Full Access | Full Access | Full Access |
| Owner | Full Access | Full Access | Full Access | Full Access | Full Access |
| Manager | No Access | Store Access | No Access | Store Access | Store Access |
| Cashier | No Access | Read Only | No Access | Read Only | Read Only |

## Data Flow

### 1. **Procurement Flow**
```
Supplier → Commissary Inventory → Conversion → Store Inventory → Menu Items
```

### 2. **Conversion Flow**
```
Raw Materials (Commissary) → Processing → Finished Goods (Store) → Recipe Usage
```

### 3. **Order Flow**
```
Store Inventory Need → Purchase Order → Supplier → Delivery → Store Stock Update
```

## Security Features

### Row-Level Security (RLS) Policies
- **Commissary inventory**: Admin/Owner access only
- **Store inventory**: Store-based access control
- **Conversions**: Admin can see all, stores see their own
- **Orders**: Store-based isolation
- **Recipes**: Store-based access

### Data Isolation
- **Store-based data separation** ensures stores only see their own data
- **Admin oversight** allows full system visibility
- **Audit trails** for all critical operations
- **Role-based UI rendering** hides unauthorized features

## API Endpoints & Services

### Commissary Inventory Services
- `fetchCommissaryInventory()` - Get commissary items with filtering
- `createCommissaryInventoryItem()` - Add new commissary item
- `updateCommissaryInventoryItem()` - Update existing item
- `adjustCommissaryInventoryStock()` - Stock adjustments

### Conversion Services
- `fetchInventoryConversions()` - Get conversion history
- `createInventoryConversion()` - Process raw materials to finished goods
- `fetchCommissaryItemsForConversion()` - Get available raw materials
- `createOrFindStoreInventoryItem()` - Create target inventory items

### Enhanced Existing Services
- Updated inventory services to work with store-level data
- Enhanced recipe services for store inventory integration
- Modified order services for store inventory restrictions

## Migration & Deployment

### Database Migrations
1. **20250523_create_inventory_tables.sql** - Enhanced with commissary tables
2. **20250524_create_two_tier_inventory_system.sql** - Complete schema setup

### Sample Data
- **Commissary inventory items** - Raw materials and supplies
- **Suppliers** - Sample supplier data
- **Store inventory** - Finished goods samples
- **Conversion examples** - Sample conversion data

## Benefits

### For Administrators
- **Centralized control** over raw material procurement
- **Cost optimization** through bulk purchasing
- **Quality control** at the commissary level
- **Standardized processes** across all stores

### For Store Managers
- **Simplified inventory** with ready-to-use items
- **Focus on operations** rather than procurement
- **Consistent product quality** from commissary processing
- **Reduced complexity** in daily operations

### For the Business
- **Better cost control** and inventory valuation
- **Improved traceability** from raw materials to finished products
- **Scalable operations** as new stores are added
- **Compliance readiness** for food safety regulations

## Future Enhancements

### Planned Features
- **Automated conversion suggestions** based on store inventory levels
- **Batch conversion processing** for efficiency
- **Integration with POS** for real-time inventory updates
- **Advanced reporting** and analytics
- **Mobile app support** for inventory management

### Potential Integrations
- **Barcode scanning** for inventory management
- **IoT sensors** for automated stock monitoring
- **Supplier API integration** for automated ordering
- **Accounting system integration** for cost tracking

## Troubleshooting

### Common Issues
1. **Access Denied Errors** - Check user role and permissions
2. **Conversion Failures** - Verify commissary stock availability
3. **Missing Store Items** - Ensure proper store selection
4. **Recipe Errors** - Confirm ingredients exist in store inventory

### Support
- Check application logs for detailed error messages
- Verify database connectivity and permissions
- Ensure proper role assignments for users
- Contact system administrator for access issues
