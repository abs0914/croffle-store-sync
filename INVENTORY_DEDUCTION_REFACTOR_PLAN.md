# 🔧 INVENTORY DEDUCTION SYSTEM - ARCHITECTURAL REFACTOR PLAN

**Status:** Planning Complete - Awaiting Approval
**Priority:** CRITICAL - Addresses all 16 identified reliability issues
**Estimated Time:** 12-16 hours total implementation

---

## 📋 EXECUTIVE SUMMARY

This refactor consolidates 6 fragmented inventory deduction services into a single, atomic, reliable system with proper concurrency control, rollback mechanisms, and multi-store isolation.

### Key Improvements:
- ✅ Database-level atomicity with PostgreSQL transactions
- ✅ Optimistic concurrency control to prevent race conditions
- ✅ Single unified deduction service (eliminates 5 redundant services)
- ✅ Proper store-level inventory isolation
- ✅ Idempotency protection against duplicate deductions
- ✅ Automatic rollback on failure
- ✅ Offline transaction queue with manual approval workflow
- ✅ Fix all 16 identified issues

---

## 🎯 PHASE 1: DATABASE SCHEMA ENHANCEMENTS (2-3 hours)

### 1.1 Add Version Column for Optimistic Locking
```sql
-- Prevents race conditions through version-based concurrency control
ALTER TABLE inventory_stock 
ADD COLUMN version INTEGER DEFAULT 1 NOT NULL;

-- Trigger to auto-increment version on every update
CREATE OR REPLACE FUNCTION increment_inventory_version()
RETURNS TRIGGER AS $$
BEGIN
  NEW.version = OLD.version + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER inventory_stock_version_trigger
BEFORE UPDATE ON inventory_stock
FOR EACH ROW
EXECUTE FUNCTION increment_inventory_version();
```

### 1.2 Add Idempotency Protection
```sql
-- Prevents duplicate deductions if transaction is retried
CREATE TABLE inventory_deduction_idempotency (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  deduction_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT fk_transaction FOREIGN KEY (transaction_id) 
    REFERENCES transactions(id) ON DELETE CASCADE
);

CREATE INDEX idx_idempotency_key ON inventory_deduction_idempotency(idempotency_key);
CREATE INDEX idx_idempotency_transaction ON inventory_deduction_idempotency(transaction_id);
```

### 1.3 Fix Conversion Mappings - Add Store Isolation
```sql
-- CRITICAL: Prevents cross-store inventory deduction
ALTER TABLE conversion_mappings 
ADD COLUMN store_id UUID NOT NULL 
  REFERENCES stores(id) ON DELETE CASCADE;

-- Remove duplicate mappings across stores
CREATE UNIQUE INDEX idx_conversion_unique_per_store 
ON conversion_mappings(recipe_ingredient_name, recipe_ingredient_unit, store_id, inventory_stock_id)
WHERE is_active = true;

-- Add index for fast store-filtered lookups
CREATE INDEX idx_conversion_store_lookup 
ON conversion_mappings(store_id, recipe_ingredient_name, recipe_ingredient_unit)
WHERE is_active = true;
```

### 1.4 Add Offline Transaction Queue Table
```sql
-- Stores offline transactions requiring manual approval
CREATE TABLE offline_transaction_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_data JSONB NOT NULL,
  store_id UUID NOT NULL REFERENCES stores(id),
  device_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'processed')),
  stock_validation_errors JSONB,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  notes TEXT
);

CREATE INDEX idx_offline_queue_status ON offline_transaction_queue(status, store_id);
CREATE INDEX idx_offline_queue_created ON offline_transaction_queue(created_at);
```

### 1.5 Add Compensation Log for Rollbacks
```sql
-- Tracks inventory adjustments for rollback scenarios
CREATE TABLE inventory_compensation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL,
  inventory_stock_id UUID NOT NULL REFERENCES inventory_stock(id),
  original_quantity NUMERIC(10,2) NOT NULL,
  deducted_quantity NUMERIC(10,2) NOT NULL,
  compensated_at TIMESTAMPTZ,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_compensation_transaction ON inventory_compensation_log(transaction_id);
CREATE INDEX idx_compensation_stock ON inventory_compensation_log(inventory_stock_id);
```

---

## 🎯 PHASE 2: UNIFIED DEDUCTION SERVICE (4-5 hours)

### 2.1 Create New Atomic Deduction Service

**Location:** `src/services/inventory/atomicInventoryService.ts`

**Key Features:**
- Single source of truth for ALL inventory deductions
- Database-level transaction wrapper
- Optimistic locking with version checks
- Idempotency key validation
- Automatic rollback on failure
- Proper store isolation
- Comprehensive audit logging

**Core Methods:**
```typescript
class AtomicInventoryService {
  // Main deduction method with full atomicity
  async deductInventoryAtomic(params: {
    transactionId: string;
    storeId: string;
    items: DeductionItem[];
    userId: string;
    idempotencyKey: string;
  }): Promise<DeductionResult>

  // Validate stock availability before deduction
  async validateStockAvailability(
    storeId: string,
    items: DeductionItem[]
  ): Promise<ValidationResult>

  // Rollback/compensate deduction on transaction failure
  async compensateDeduction(
    transactionId: string
  ): Promise<CompensationResult>

  // Get recipe ingredients with proper store filtering
  private async getStoreIngredients(
    productId: string,
    storeId: string
  ): Promise<IngredientMapping[]>
}
```

### 2.2 Database Transaction Wrapper

```typescript
// Wrapper for atomic operations
async function executeInTransaction<T>(
  operation: () => Promise<T>
): Promise<T> {
  const { data, error } = await supabase.rpc('begin_transaction');
  
  try {
    const result = await operation();
    await supabase.rpc('commit_transaction');
    return result;
  } catch (error) {
    await supabase.rpc('rollback_transaction');
    throw error;
  }
}
```

### 2.3 Fixed Ingredient Lookup Query

```typescript
private async getStoreIngredients(
  productId: string,
  storeId: string
): Promise<IngredientMapping[]> {
  const { data, error } = await supabase
    .from('product_catalog')
    .select(`
      recipe_id,
      recipes!inner (
        id,
        name,
        recipe_ingredients!inner (
          id,
          inventory_stock_id,
          quantity,
          unit,
          inventory_stock!inner (
            id,
            item,
            unit,
            stock_quantity,
            version,
            store_id
          )
        )
      )
    `)
    .eq('id', productId)
    .eq('recipes.recipe_ingredients.inventory_stock.store_id', storeId)
    .eq('recipes.recipe_ingredients.inventory_stock.is_active', true)
    .single();

  if (error || !data?.recipes?.recipe_ingredients) {
    throw new Error(`No ingredients found for product ${productId} in store ${storeId}`);
  }

  return data.recipes.recipe_ingredients.map(ing => ({
    inventoryStockId: ing.inventory_stock.id,
    ingredientName: ing.inventory_stock.item,
    quantityNeeded: ing.quantity,
    unit: ing.unit,
    currentStock: ing.inventory_stock.stock_quantity,
    version: ing.inventory_stock.version
  }));
}
```

---

## 🎯 PHASE 3: INTEGRATION & CLEANUP (3-4 hours)

### 3.1 Update Transaction Service Integration

**File:** `src/services/transactions/streamlinedTransactionService.ts`

Replace existing inventory deduction call:
```typescript
// OLD (Lines 212-220)
return await this.processInventoryDeduction(
  transaction.id,
  transactionData.storeId,
  expandedItems,
  transactionData.userId,
  cartItems
);

// NEW
return await atomicInventoryService.deductInventoryAtomic({
  transactionId: transaction.id,
  storeId: transactionData.storeId,
  items: expandedItems,
  userId: transactionData.userId,
  idempotencyKey: `txn-${transaction.id}-${Date.now()}`
});
```

### 3.2 Update Rollback Logic

```typescript
private async rollbackTransaction(
  transactionId: string,
  reason: string
): Promise<void> {
  // Void the transaction record
  await supabase
    .from('transactions')
    .update({ status: 'voided', voided_reason: reason })
    .eq('id', transactionId);

  // NEW: Compensate inventory deductions
  await atomicInventoryService.compensateDeduction(transactionId);
  
  console.log(`✅ Transaction ${transactionId} rolled back with inventory compensation`);
}
```

### 3.3 Delete Redundant Services

**Services to Remove:**
1. `src/services/inventory/inventoryDeductionService.ts` ❌
2. `src/services/inventory/phase4InventoryService.ts` ❌
3. `src/services/inventory/simplifiedInventoryAuditService.ts` ❌
4. `src/services/transactions/ultraSimplifiedTransactionInventory.ts` ❌
5. `src/services/inventory/simplifiedMixMatchService.ts` ❌
6. `src/services/inventory/enhancedBatchInventoryService.ts` ❌

**Keep Only:**
- `src/services/inventory/atomicInventoryService.ts` ✅

### 3.4 Remove Problematic Product

```sql
-- Remove "Mini Croffle Base" that has zero ingredients
DELETE FROM product_catalog 
WHERE id = 'b300ecd4-722f-4142-b72d-67421e129edc'
  AND product_name = 'Mini Croffle Base';

-- Also remove its orphaned recipe
DELETE FROM recipes
WHERE id = '81f78b9b-c28d-4b0a-8300-5c64bc949466'
  AND name = 'Mini Croffle Base';
```

---

## 🎯 PHASE 4: OFFLINE TRANSACTION QUEUE (2-3 hours)

### 4.1 Offline Sync Validation Service

**Location:** `src/services/offline/offlineQueueService.ts`

```typescript
class OfflineQueueService {
  // Check if offline transaction can be processed
  async validateOfflineTransaction(
    transactionData: OfflineTransaction
  ): Promise<ValidationResult> {
    const validation = await atomicInventoryService
      .validateStockAvailability(
        transactionData.storeId,
        transactionData.items
      );

    if (!validation.isValid) {
      // Queue for manual approval
      await this.queueForApproval(transactionData, validation.errors);
      return { needsApproval: true, errors: validation.errors };
    }

    return { needsApproval: false };
  }

  // Queue transaction requiring approval
  private async queueForApproval(
    transaction: OfflineTransaction,
    errors: StockError[]
  ): Promise<void> {
    await supabase
      .from('offline_transaction_queue')
      .insert({
        transaction_data: transaction,
        store_id: transaction.storeId,
        device_id: transaction.deviceId,
        status: 'pending',
        stock_validation_errors: errors
      });
  }

  // Process approved transactions
  async processApprovedTransaction(
    queueId: string,
    approvedBy: string
  ): Promise<void> {
    // Load queued transaction
    // Process with atomic service
    // Mark as processed
  }
}
```

### 4.2 Admin Approval UI Component

**Location:** `src/components/offline/OfflineTransactionApprovalQueue.tsx`

Shows pending offline transactions requiring manual approval with stock errors.

---

## 🎯 PHASE 5: TESTING & VALIDATION (1-2 hours)

### 5.1 Automated Tests
- Test concurrent transactions (simulate race conditions)
- Test idempotency (retry same transaction)
- Test rollback scenarios
- Test cross-store isolation
- Test offline queue workflow

### 5.2 Manual Validation Checklist
- [ ] Create transaction in Store A, verify only Store A inventory deducted
- [ ] Cancel transaction, verify inventory restored
- [ ] Retry failed transaction, verify no double deduction
- [ ] Process 10 concurrent transactions, verify all inventory correct
- [ ] Sync offline transaction with insufficient stock, verify queued for approval
- [ ] Approve queued transaction, verify processed correctly

---

## 📊 ISSUES RESOLVED BY THIS REFACTOR

| Issue # | Description | Resolution |
|---------|-------------|------------|
| #1 | Race Conditions | Optimistic locking with version column |
| #2 | 6 Code Paths | Consolidated to 1 service |
| #3 | Silent Failures | Atomic transactions with rollback |
| #4 | Non-Atomic Ops | Database transaction wrapper |
| #5 | Double Deduction | Idempotency keys |
| #6 | Offline No Revalidation | Queue with validation |
| #7 | No Rollback | Compensation log + restore |
| #8 | RLS Complexity | Service-level enforcement |
| #9 | No Idempotency | Idempotency table |
| #10 | Validation Window | Two-phase commit pattern |
| #11 | Trigger Side Effects | Controlled trigger execution |
| #12 | Error Swallowing | Atomic all-or-nothing |
| #13 | Duplicate Mappings | Store_id column + unique index |
| #14 | Zero Ingredients | Product removal |
| #15 | Flawed Query | Fixed JOIN structure |
| #16 | Unused Mappings | Integrated into lookup |

---

## 🚀 IMPLEMENTATION ORDER

### Step 1: Database Schema (Execute First)
Run all Phase 1 migrations to add columns, indexes, and tables.

### Step 2: Create Atomic Service
Build new `atomicInventoryService.ts` with all core logic.

### Step 3: Integrate & Test
Update `streamlinedTransactionService.ts` to use new service.
Test thoroughly before cleanup.

### Step 4: Clean Up
Delete old services only after confirming new service works.

### Step 5: Offline Queue
Implement offline validation and approval workflow.

### Step 6: Final Validation
Run comprehensive test suite to verify all 16 issues resolved.

---

## ⚠️ RISKS & MITIGATION

### Risk 1: Breaking Existing Functionality
**Mitigation:** Keep old services until new service fully tested. Use feature flag.

### Risk 2: Migration Downtime
**Mitigation:** Schema changes are additive (no data loss). Can run during low traffic.

### Risk 3: Complex Rollback Logic
**Mitigation:** Extensive testing of compensation scenarios before deployment.

---

## 📝 APPROVAL CHECKLIST

Before proceeding with implementation:
- [ ] User approves overall architecture
- [ ] User confirms store isolation requirements
- [ ] User confirms offline queue workflow
- [ ] User confirms product removal
- [ ] User confirms timeline (12-16 hours)

---

**Ready to proceed with Phase 1 (Database Schema) upon your approval.**
