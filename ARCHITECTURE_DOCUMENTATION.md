# Croffle Store Sync - System Architecture Documentation

## Overview

The Croffle Store Sync system is a comprehensive Point of Sale (POS) and inventory management solution designed for multi-store operations with centralized commissary management. The system follows a three-tier architecture with clear separation of concerns.

## Three-Tier Architecture

### 1. Presentation Layer (Frontend)
- **Technology**: React with TypeScript, Vite, Tailwind CSS
- **Components**: 
  - POS Interface (`src/components/pos/`)
  - Inventory Management UI (`src/components/inventory/`)
  - Admin Dashboard (`src/components/admin/`)
  - Store Management (`src/components/stores/`)
- **State Management**: React hooks and context
- **Routing**: React Router for navigation

### 2. Business Logic Layer (Services)
- **Location**: `src/services/`
- **Key Services**:
  - **POS Services** (`src/services/pos/`):
    - Transaction processing
    - Recipe-commissary integration
    - Automatic inventory deduction
  - **Inventory Management** (`src/services/inventoryManagement/`):
    - Store-level inventory operations
    - Commissary inventory management
    - Conversion tracking and recipes
  - **Store Management** (`src/services/stores/`):
    - Multi-store operations
    - User access control

### 3. Data Layer (Database)
- **Technology**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth with Row Level Security (RLS)
- **Real-time**: Supabase real-time subscriptions

## Database Schema Overview

### Core Tables

#### Store Management
- `stores` - Store locations and configurations
- `app_users` - User management with role-based access
- `suppliers` - Vendor and supplier information

#### Inventory System (Two-Tier)

##### Store-Level Inventory
- `inventory_stock` - Store-specific inventory items
- `inventory_transactions` - All inventory movements and transactions

##### Commissary-Level Inventory
- `commissary_inventory` - Central raw materials and supplies
- `inventory_conversions` - Tracks raw material → finished goods conversions

#### Recipe System
- `recipes` - Product recipes with ingredients
- `recipe_ingredients` - Recipe components linking to store inventory
- `recipe_usage_log` - Tracks recipe usage in POS transactions

#### Conversion System
- `conversion_recipes` - Templates for converting raw materials
- `conversion_recipe_ingredients` - Ingredients for conversion recipes
- `conversion_ingredients` - Actual conversion tracking

#### Ordering System
- `orders` - Purchase orders to suppliers
- `order_items` - Individual items in orders
- `purchase_orders` - Store purchase requests
- `purchase_order_items` - Items in purchase requests
- `delivery_orders` - Delivery tracking
- `goods_received_notes` - Goods receipt documentation

## Data Flow Architecture

### 1. POS Transaction Flow
```
Customer Purchase → POS Interface → Recipe Processing → Store Inventory Deduction → Commissary Deduction → Transaction Logging
```

### 2. Inventory Conversion Flow
```
Commissary Raw Materials → Conversion Recipe → Store Finished Goods → Recipe Usage → POS Sales
```

### 3. Ordering Flow
```
Store Inventory Low → Purchase Order → Supplier → Delivery → Goods Receipt → Inventory Update
```

## Key Integration Points

### Recipe-Commissary Integration
- **Purpose**: Automatically deduct commissary inventory when recipes are used in POS
- **Implementation**: `src/services/pos/commissaryRecipeIntegration.ts`
- **Process**:
  1. Recipe used in POS transaction
  2. System finds commissary mappings via `inventory_conversions`
  3. Calculates commissary deduction based on conversion ratios
  4. Updates commissary stock levels
  5. Logs transactions for audit trail

### Automatic Inventory Deduction
- **Store Level**: Direct deduction from `inventory_stock` when recipes are processed
- **Commissary Level**: Proportional deduction from `commissary_inventory` based on conversion ratios
- **Transaction Logging**: All movements recorded in `inventory_transactions`

### Multi-Store Management
- **Store Isolation**: Each store has separate inventory and transactions
- **Centralized Commissary**: Shared commissary serves all stores
- **Role-Based Access**: Users can access specific stores based on permissions

## Security Architecture

### Authentication & Authorization
- **Supabase Auth**: JWT-based authentication
- **Row Level Security (RLS)**: Database-level access control
- **Role-Based Access**: Admin, Owner, Store Manager, Staff roles
- **Store-Based Permissions**: Users can only access assigned stores

### Data Protection
- **Encrypted Connections**: All API calls use HTTPS
- **Database Security**: PostgreSQL with RLS policies
- **Audit Trail**: Complete transaction logging for compliance

## Performance Considerations

### Database Optimization
- **Indexes**: Strategic indexing on frequently queried columns
- **Query Optimization**: Efficient joins and filtering
- **Connection Pooling**: Supabase handles connection management

### Frontend Optimization
- **Code Splitting**: Lazy loading of components
- **Caching**: Strategic use of React Query for data caching
- **Real-time Updates**: Selective subscriptions to reduce overhead

## Scalability Design

### Horizontal Scaling
- **Multi-Store Support**: Architecture supports unlimited stores
- **Microservice Ready**: Services are loosely coupled
- **Database Scaling**: PostgreSQL supports read replicas

### Vertical Scaling
- **Efficient Queries**: Optimized database operations
- **Resource Management**: Proper memory and CPU usage
- **Caching Strategy**: Reduces database load

## Error Handling & Resilience

### Error Management
- **Graceful Degradation**: System continues operating with reduced functionality
- **User Feedback**: Clear error messages and recovery suggestions
- **Logging**: Comprehensive error logging for debugging

### Data Consistency
- **Transaction Management**: Database transactions ensure data integrity
- **Rollback Mechanisms**: Failed operations are properly rolled back
- **Validation**: Input validation at multiple layers

## Monitoring & Maintenance

### Health Monitoring
- **Database Health**: Monitor connection pools and query performance
- **Application Health**: Track error rates and response times
- **Business Metrics**: Monitor inventory levels and transaction volumes

### Maintenance Procedures
- **Database Maintenance**: Regular backups and optimization
- **Code Updates**: Staged deployment process
- **Data Migration**: Versioned migration scripts

## Future Enhancements

### Planned Features
- **Advanced Analytics**: Business intelligence and reporting
- **Mobile App**: Native mobile applications for staff
- **API Integration**: Third-party integrations (accounting, e-commerce)
- **Advanced Forecasting**: AI-powered demand prediction

### Technical Improvements
- **Microservices**: Further decomposition of services
- **Event-Driven Architecture**: Implement event sourcing
- **Advanced Caching**: Redis integration for performance
- **Container Deployment**: Docker containerization for easier deployment

## Development Guidelines

### Code Organization
- **Feature-Based Structure**: Organize code by business features
- **Separation of Concerns**: Clear boundaries between layers
- **Reusable Components**: Shared utilities and components

### Best Practices
- **Type Safety**: Full TypeScript implementation
- **Testing**: Comprehensive unit and integration tests
- **Documentation**: Inline code documentation and API docs
- **Version Control**: Git-based workflow with feature branches

## Deployment Architecture

### Environment Strategy
- **Development**: Local development with Supabase local instance
- **Staging**: Pre-production testing environment
- **Production**: Live system with monitoring and backups

### Infrastructure
- **Frontend Hosting**: Vercel or similar CDN-based hosting
- **Backend**: Supabase managed PostgreSQL and API
- **Monitoring**: Application and infrastructure monitoring
- **Backups**: Automated daily backups with point-in-time recovery
