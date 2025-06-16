# Recipe-Commissary Integration Implementation Guide

## Overview

This guide provides detailed implementation instructions for the automatic commissary deduction system when recipes are processed in the POS system.

## System Flow

### 1. Recipe Processing in POS
When a recipe is used in a POS transaction:
1. Store-level inventory is deducted from `inventory_stock`
2. System calculates corresponding commissary deductions
3. Commissary inventory is updated in `commissary_inventory`
4. All transactions are logged for audit trail

### 2. Conversion Mapping System
The system uses `inventory_conversions` table to map:
- Commissary raw materials → Store finished goods
- Conversion ratios for accurate deduction calculations
- Historical conversion data for optimization

## Implementation Steps

### Step 1: Database Fixes (CRITICAL - Run First)

Execute the SQL queries in `database_fixes.sql` to:
- Fix foreign key references in conversion tables
- Ensure proper table relationships
- Create missing indexes for performance
- Set up proper RLS policies

### Step 2: Service Layer Updates (COMPLETED)

The following services have been updated to use correct table references:

#### CommissaryInventoryService
- ✅ Fixed to query `commissary_inventory` instead of `inventory_items`
- ✅ Removed unnecessary category transformations
- ✅ Updated all CRUD operations

#### InventoryConversionService
- ✅ Fixed foreign key references to `commissary_inventory`
- ✅ Updated conversion recipe queries

#### CommissaryRecipeIntegration
- ✅ Fixed all commissary inventory queries
- ✅ Updated stock deduction logic
- ✅ Improved error handling

### Step 3: Integration Testing

After running the database fixes, test the following workflows:

#### Test 1: Commissary Inventory Management
```typescript
// Test creating commissary items
const newItem = await createCommissaryInventoryItem({
  name: "Test Raw Material",
  category: "raw_materials",
  current_stock: 100,
  minimum_threshold: 20,
  unit: "kg",
  unit_cost: 15.50
});

// Test fetching commissary inventory
const inventory = await fetchCommissaryInventory();
console.log("Commissary inventory:", inventory);
```

#### Test 2: Recipe-Commissary Mapping
```typescript
// Test getting commissary mappings for a recipe
const mappings = await getRecipeCommissaryMappings(recipeId, storeId);
console.log("Commissary mappings:", mappings);

// Test commissary availability check
const availability = await checkCommissaryAvailabilityForRecipe(
  recipeId, 
  quantityNeeded, 
  storeId
);
console.log("Can make recipe:", availability.canMake);
```

#### Test 3: Automatic Deduction
```typescript
// Test commissary deduction when recipe is used
const result = await deductCommissaryForRecipe(
  recipeId,
  quantityUsed,
  storeId,
  userId,
  transactionId
);
console.log("Deduction result:", result);
```

### Step 4: POS Integration

Integrate the commissary deduction into your POS workflow:

```typescript
// In your POS transaction processing
export const processRecipeTransaction = async (
  recipeId: string,
  quantity: number,
  storeId: string,
  userId: string
) => {
  try {
    // 1. Process store-level inventory deduction
    const storeResult = await deductRecipeFromInventory(
      recipeId, 
      quantity, 
      storeId, 
      userId
    );
    
    if (!storeResult.success) {
      throw new Error("Store inventory deduction failed");
    }

    // 2. Process commissary deduction
    const commissaryResult = await deductCommissaryForRecipe(
      recipeId,
      quantity,
      storeId,
      userId,
      storeResult.transactionId
    );

    // 3. Log the complete transaction
    await logRecipeUsage({
      recipe_id: recipeId,
      store_id: storeId,
      quantity_used: quantity,
      used_by: userId,
      transaction_id: storeResult.transactionId,
      commissary_deductions: commissaryResult.commissary_deductions
    });

    return {
      success: true,
      store_deductions: storeResult.deductions,
      commissary_deductions: commissaryResult.commissary_deductions
    };

  } catch (error) {
    console.error("Recipe transaction failed:", error);
    // Implement rollback logic here
    throw error;
  }
};
```

### Step 5: Error Handling & Rollback

Implement proper error handling and rollback mechanisms:

```typescript
export const rollbackRecipeTransaction = async (
  transactionId: string,
  storeDeductions: any[],
  commissaryDeductions: any[]
) => {
  try {
    // Rollback store inventory
    for (const deduction of storeDeductions) {
      await supabase
        .from('inventory_stock')
        .update({
          stock_quantity: supabase.raw(`stock_quantity + ${deduction.quantity}`)
        })
        .eq('id', deduction.inventory_stock_id);
    }

    // Rollback commissary inventory
    for (const deduction of commissaryDeductions) {
      await supabase
        .from('commissary_inventory')
        .update({
          current_stock: supabase.raw(`current_stock + ${deduction.quantity_deducted}`)
        })
        .eq('id', deduction.commissary_item_id);
    }

    // Mark transaction as rolled back
    await supabase
      .from('inventory_transactions')
      .update({ notes: 'ROLLED BACK' })
      .eq('reference_id', transactionId);

  } catch (error) {
    console.error("Rollback failed:", error);
    // Alert administrators
  }
};
```

## Configuration & Setup

### 1. Conversion Ratios Setup

Set up conversion ratios in the `inventory_conversions` table:

```sql
-- Example: 1 kg of raw caramel syrup makes 20 portions of caramel
INSERT INTO inventory_conversions (
  commissary_item_id,
  store_id,
  inventory_stock_id,
  raw_material_quantity,
  finished_goods_quantity,
  conversion_ratio,
  converted_by,
  notes
) VALUES (
  'commissary-caramel-id',
  'store-id',
  'store-caramel-id',
  1.0,  -- 1 kg raw material
  20.0, -- makes 20 portions
  0.05, -- 0.05 kg per portion
  'admin-user-id',
  'Initial conversion ratio setup'
);
```

### 2. Recipe Setup

Ensure recipes are properly linked to store inventory:

```sql
-- Example recipe with ingredients
INSERT INTO recipes (id, name, store_id, yield_quantity) 
VALUES ('recipe-id', 'Caramel Croffle', 'store-id', 1);

INSERT INTO recipe_ingredients (recipe_id, inventory_stock_id, quantity, unit)
VALUES ('recipe-id', 'store-caramel-id', 2, 'portions');
```

### 3. Monitoring & Alerts

Set up monitoring for:
- Low commissary stock levels
- Failed deduction transactions
- Conversion ratio accuracy
- Recipe usage patterns

## Best Practices

### 1. Data Consistency
- Always use database transactions for multi-table updates
- Implement proper rollback mechanisms
- Validate data before processing

### 2. Performance Optimization
- Use database indexes on frequently queried columns
- Batch operations when possible
- Cache conversion ratios for frequently used recipes

### 3. Error Handling
- Provide clear error messages to users
- Log all errors for debugging
- Implement graceful degradation

### 4. Audit Trail
- Log all inventory movements
- Track who performed each operation
- Maintain historical data for analysis

## Troubleshooting

### Common Issues

#### 1. Foreign Key Constraint Errors
- **Cause**: Tables referencing wrong parent tables
- **Solution**: Run the database fixes in `database_fixes.sql`

#### 2. Conversion Ratio Calculation Errors
- **Cause**: Incorrect or missing conversion data
- **Solution**: Verify `inventory_conversions` table data

#### 3. Insufficient Stock Errors
- **Cause**: Commissary stock levels too low
- **Solution**: Implement stock level monitoring and alerts

#### 4. Transaction Logging Failures
- **Cause**: Missing or incorrect transaction data
- **Solution**: Validate all required fields before logging

### Debugging Steps

1. **Check Database Constraints**:
   ```sql
   SELECT * FROM information_schema.table_constraints 
   WHERE constraint_type = 'FOREIGN KEY' 
   AND table_name IN ('conversion_ingredients', 'conversion_recipe_ingredients');
   ```

2. **Verify Conversion Data**:
   ```sql
   SELECT ic.*, ci.name as commissary_name, is.item as store_item
   FROM inventory_conversions ic
   JOIN commissary_inventory ci ON ic.commissary_item_id = ci.id
   JOIN inventory_stock is ON ic.inventory_stock_id = is.id;
   ```

3. **Check Transaction Logs**:
   ```sql
   SELECT * FROM inventory_transactions 
   WHERE transaction_type = 'commissary_recipe_usage'
   ORDER BY created_at DESC;
   ```

## Next Steps

1. **Run Database Fixes**: Execute `database_fixes.sql` in Supabase
2. **Test Services**: Verify all commissary services work correctly
3. **Integrate POS**: Add commissary deduction to POS workflow
4. **Monitor Performance**: Set up monitoring and alerts
5. **Train Users**: Provide training on the new system

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the architecture documentation
3. Examine the service implementation code
4. Test with small datasets first before full deployment
