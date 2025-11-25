# Atomic Inventory System - Complete Documentation

## Overview

The Atomic Inventory System is a comprehensive, production-ready solution for reliable inventory deductions with full atomicity, idempotency, store isolation, and offline support.

## Architecture

### Core Components

1. **AtomicInventoryService** (`src/services/inventory/atomicInventoryService.ts`)
   - Main deduction engine with optimistic locking
   - Idempotency protection
   - Two-phase commit (validate → deduct)
   - Compensation/rollback support

2. **OfflineQueueService** (`src/services/inventory/offlineQueueService.ts`)
   - Queues transactions when offline
   - Auto-syncs when online
   - Manual approval for insufficient stock

3. **AtomicInventoryMonitor** (`src/services/inventory/atomicInventoryMonitor.ts`)
   - Real-time health monitoring
   - Performance metrics
   - Queue statistics

### Database Schema

#### Key Tables

**inventory_stock**
- `version` (integer): Optimistic locking counter
- Automatically incremented on each update via trigger

**inventory_deduction_idempotency**
- Tracks processed transactions
- Prevents duplicate deductions

**offline_transaction_queue**
- Stores offline transactions
- Status: pending | insufficient_stock | approved | rejected

**inventory_compensation_log**
- Audit trail for rollbacks
- Tracks all inventory restorations

**conversion_mappings**
- `store_id` (required): Ensures store isolation
- Maps recipe ingredients to inventory items

## Features

### ✅ 16 Critical Issues Fixed

1. **Optimistic Locking**: Version-based concurrency control
2. **Idempotency**: Duplicate request protection
3. **Atomic Operations**: All-or-nothing deductions
4. **Store Isolation**: No cross-store deductions
5. **Two-Phase Commit**: Validate before deduct
6. **Compensation Log**: Full rollback audit trail
7. **Offline Queue**: Manual approval workflow
8. **Error Recovery**: Comprehensive error handling
9. **Database Constraints**: Proper foreign keys and indexes
10. **Transaction Wrapper**: Database-level atomicity
11. **Conversion Mapping Deduplication**: Store-unique mappings
12. **Zero-Ingredient Prevention**: Products must have ingredients
13. **Proper Ingredient Lookup**: Store-filtered queries
14. **Movement Tracking**: Complete audit trail
15. **Negative Stock Prevention**: Optional enforcement
16. **Concurrent Update Safety**: Version conflicts detected

## Usage

### Basic Deduction

```typescript
import { AtomicInventoryService, DeductionItem } from '@/services/inventory/atomicInventoryService';

const items: DeductionItem[] = [
  {
    productId: 'product-123',
    productName: 'Croffle',
    quantity: 2
  }
];

const result = await AtomicInventoryService.deductInventoryAtomic({
  transactionId: 'txn-456',
  storeId: 'store-789',
  items,
  userId: 'user-101',
  idempotencyKey: 'unique-key-112233'
});

if (result.success) {
  console.log('✅ Deduction successful');
} else {
  console.error('❌ Deduction failed:', result.errors);
}
```

### Integration with Transaction Service

```typescript
import { AtomicInventoryService } from '@/services/inventory/atomicInventoryService';

// In your transaction completion handler
try {
  const idempotencyKey = `transaction-${transactionId}-${Date.now()}`;
  
  const deductionResult = await AtomicInventoryService.deductInventoryAtomic({
    transactionId,
    storeId,
    items: formattedItems,
    userId,
    idempotencyKey
  });

  if (!deductionResult.success) {
    // Handle insufficient stock - maybe queue for offline
    throw new Error(`Inventory deduction failed: ${deductionResult.errors.join(', ')}`);
  }
} catch (error) {
  // Rollback transaction if needed
  console.error('Transaction failed:', error);
}
```

### Offline Queue Management

```typescript
import { OfflineQueueService } from '@/services/inventory/offlineQueueService';

// Queue transaction when offline
await OfflineQueueService.queueTransaction(
  transactionId,
  storeId,
  deviceId,
  items,
  'offline' // or 'insufficient_stock'
);

// Sync when back online
const result = await OfflineQueueService.syncAllPending(storeId, userId);
console.log(`Synced: ${result.synced}, Need approval: ${result.needsApproval}`);

// Manual approval
await OfflineQueueService.approveTransaction(
  queueId,
  transactionData,
  storeId,
  userId
);
```

### Rollback/Compensation

```typescript
import { AtomicInventoryService } from '@/services/inventory/atomicInventoryService';

// Rollback when voiding a transaction
const rollbackResult = await AtomicInventoryService.compensateDeduction(transactionId);

if (rollbackResult.success) {
  console.log(`✅ Restored ${rollbackResult.itemsRestored} items`);
}
```

## Monitoring Dashboard

Access the monitoring dashboard at `/inventory/atomic-dashboard` (route needs to be added).

### Dashboard Features

1. **Overview Tab**
   - System health status
   - Success rate metrics
   - Queue statistics
   - Key features summary

2. **Health Checks Tab**
   - Version column status
   - Idempotency table
   - Conversion mappings
   - Cross-store prevention
   - Compensation log
   - Recent success rate

3. **Queue Management Tab**
   - Pending transactions
   - Insufficient stock items
   - Approve/reject workflow

4. **Metrics Tab**
   - Total deductions
   - Success/failure rates
   - 24-hour performance
   - Queue statistics

## Error Handling

### Common Errors

**Insufficient Stock**
```
Error: "Product A - Ingredient X: Need 5, Have 3 (Short: 2)"
```
**Solution**: Queue for manual approval or restock

**Version Conflict**
```
Error: "Version conflict on inventory_stock_id: abc123"
```
**Solution**: Automatic retry with fresh version

**Cross-Store Deduction Attempt**
```
Error: "No conversion mapping found for Ingredient X in store Y"
```
**Solution**: Check conversion mappings have store_id set

**Duplicate Request**
```
Warning: "Request already processed (idempotency)"
```
**Solution**: No action needed - duplicate prevented

## Testing

### Health Check

```typescript
import { AtomicInventoryMonitor } from '@/services/inventory/atomicInventoryMonitor';

const health = await AtomicInventoryMonitor.runHealthCheck(storeId);

if (health.status === 'critical') {
  console.error('Critical issues:', health.checks.filter(c => c.status === 'critical'));
}
```

### Metrics

```typescript
const metrics = await AtomicInventoryMonitor.getDeductionMetrics(storeId);
console.log(`Success rate: ${100 - metrics.last_24h.failure_rate}%`);

const queueMetrics = await AtomicInventoryMonitor.getQueueMetrics(storeId);
console.log(`Pending: ${queueMetrics.pending}, Need approval: ${queueMetrics.insufficient_stock}`);
```

## Configuration

### Database Triggers

The system relies on automatic triggers:

```sql
-- Version increment trigger (already created in migration)
CREATE TRIGGER increment_inventory_version
BEFORE UPDATE ON inventory_stock
FOR EACH ROW
EXECUTE FUNCTION increment_inventory_version();
```

### Required Indexes

```sql
-- For fast idempotency checks
CREATE INDEX idx_idempotency_transaction ON inventory_deduction_idempotency(transaction_id);
CREATE INDEX idx_idempotency_key ON inventory_deduction_idempotency(idempotency_key);

-- For store-filtered queries
CREATE INDEX idx_conversion_store ON conversion_mappings(store_id);
CREATE UNIQUE INDEX idx_conversion_unique_per_store 
ON conversion_mappings(store_id, recipe_ingredient_name, recipe_ingredient_unit);

-- For queue management
CREATE INDEX idx_queue_store_status ON offline_transaction_queue(store_id, status);
```

## Best Practices

1. **Always use idempotency keys** - Prevent duplicate deductions
2. **Check health regularly** - Monitor system status
3. **Handle offline gracefully** - Queue transactions for manual review
4. **Log all operations** - Use compensation log for audit trail
5. **Test with real data** - Verify store isolation and mappings
6. **Monitor success rates** - Track deduction performance
7. **Approve queued items promptly** - Don't let queue grow too large

## Troubleshooting

### Issue: Deductions failing with "No conversion mapping"

**Cause**: Missing or incorrect conversion mappings for ingredients

**Solution**:
1. Check conversion mappings have `store_id` set
2. Verify ingredient names match exactly between recipes and mappings
3. Run health check to identify specific missing mappings

### Issue: Version conflicts occurring frequently

**Cause**: High concurrency or slow queries

**Solution**:
1. Implement exponential backoff for retries
2. Check database performance
3. Consider batch operations for multiple items

### Issue: Queue growing too large

**Cause**: Not syncing or approving queued transactions

**Solution**:
1. Run `syncAllPending()` regularly
2. Review and approve insufficient stock items
3. Check network connectivity for auto-sync

### Issue: Cross-store deductions detected

**Cause**: Conversion mappings without store_id

**Solution**:
1. Run migration to add store_id to conversion_mappings
2. Deduplicate mappings per store
3. Verify health check shows no cross-store issues

## Migration History

- **Phase 1**: Database schema enhancements (version, idempotency, queue, compensation)
- **Phase 2**: Atomic service implementation with optimistic locking
- **Phase 3**: Integration with transaction service and cleanup
- **Phase 4**: Offline queue with manual approval
- **Phase 5**: Monitoring dashboard and documentation

## Support

For issues or questions:
1. Check health dashboard first
2. Review console logs for detailed error messages
3. Verify database constraints and triggers are in place
4. Check conversion mappings are complete and store-specific

## Version

Current Version: 1.0.0
Last Updated: 2025-01-25
