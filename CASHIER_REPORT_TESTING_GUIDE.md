# Cashier Report Testing Guide

## 🎯 Testing Objective

Verify that the cashier performance report fixes are working correctly by testing:
1. **Real cashier name resolution** from app_users table
2. **Store-specific data filtering** (different data per store)
3. **Sample data detection accuracy** (no false positives)
4. **Store switching functionality** (proper data refresh)

## 📋 Pre-Testing Setup

### Step 1: Insert Test Data
Execute the SQL in `test-cashier-data.sql` in your database. This creates:
- **3 test cashiers**: Maria Santos, Juan Dela Cruz, Ana Rodriguez
- **6 test transactions**: 4 for Store 1, 2 for Store 2
- **4 test shifts**: 2 per store
- **Proper store access permissions** for each cashier

### Step 2: Set Application Date
- Navigate to the cashier performance report
- Set the date to **May 26th, 2025** (or adjust the SQL dates to today's date)
- This ensures the test transactions are within the selected date range

## 🧪 Test Scenarios

### Test 1: Store 1 (Robinsons North) - Real Data
**Expected Results:**
```
📊 Cashier Count: 2
📊 Total Transactions: 4  
📊 Total Sales: ₱1,576.50
📊 Average Transaction Value: ₱394.13

Top Performing Cashiers:
1. Juan Dela Cruz - ₱845.25 (2 transactions)
2. Maria Santos - ₱731.25 (2 transactions)
```

**Console Output to Look For:**
```
🔄 Fetching cashier report for a12a8269-5cbc-4a78-bae0-d6f166e1446d
💳 Transactions fetched: 4 for store: a12a8269-5cbc-4a78-bae0-d6f166e1446d
⏰ Shifts fetched: 2 for store: a12a8269-5cbc-4a78-bae0-d6f166e1446d
👥 Cashier report result: {
  cashierNames: ["Juan Dela Cruz", "Maria Santos"],
  storeId: "a12a8269-5cbc-4a78-bae0-d6f166e1446d"
}
🔍 Sample data detection result: false
```

### Test 2: Store 2 - Real Data
**Expected Results:**
```
📊 Cashier Count: 2
📊 Total Transactions: 2
📊 Total Sales: ₱795.50
📊 Average Transaction Value: ₱397.75

Top Performing Cashiers:
1. Ana Rodriguez - ₱475.50 (1 transaction)
2. Juan Dela Cruz - ₱320.00 (1 transaction)
```

**Console Output to Look For:**
```
🔄 Fetching cashier report for fd45e07e-7832-4f51-b46b-7ef604359b86
💳 Transactions fetched: 2 for store: fd45e07e-7832-4f51-b46b-7ef604359b86
⏰ Shifts fetched: 2 for store: fd45e07e-7832-4f51-b46b-7ef604359b86
👥 Cashier report result: {
  cashierNames: ["Ana Rodriguez", "Juan Dela Cruz"],
  storeId: "fd45e07e-7832-4f51-b46b-7ef604359b86"
}
🔍 Sample data detection result: false
```

### Test 3: Store Switching Verification
**Steps:**
1. Start on Store 1, note the cashier names and metrics
2. Switch to Store 2 using the store selector
3. Verify that:
   - Cashier names change (Maria Santos disappears, Ana Rodriguez appears)
   - Juan Dela Cruz appears in both but with different metrics
   - Transaction counts and sales totals are different
   - No sample data warnings appear

## ✅ Success Criteria

### ✅ Real Data Detection
- [ ] **No sample data warnings** appear for either store
- [ ] **Real cashier names** displayed (Maria Santos, Juan Dela Cruz, Ana Rodriguez)
- [ ] **UI-Avatars.com avatars** used (not pravatar.cc)
- [ ] **Sample data detection returns false** in console

### ✅ Store-Specific Data
- [ ] **Different cashier lists** between stores
- [ ] **Different transaction counts** (Store 1: 4, Store 2: 2)
- [ ] **Different sales totals** (Store 1: ₱1,576.50, Store 2: ₱795.50)
- [ ] **Juan Dela Cruz shows different metrics** in each store

### ✅ Name Resolution
- [ ] **Real names from app_users table** displayed
- [ ] **No "Unknown Cashier"** entries (unless expected)
- [ ] **Proper first name + last name** formatting
- [ ] **Console shows successful user lookup** messages

### ✅ Store Switching
- [ ] **Query cache invalidation** works (new data fetched)
- [ ] **Console shows new store ID** in debug messages
- [ ] **UI updates immediately** when switching stores
- [ ] **No stale data** from previous store selection

## 🚨 Failure Indicators

### ❌ Sample Data Issues
- Sample data warning appears for real data
- Cashier names are "John Smith", "Sarah Lee", etc.
- Pravatar.cc avatars are used
- Sample data detection returns true for real data

### ❌ Store Filtering Issues
- Same cashier data appears for both stores
- Same transaction counts across all stores
- Console shows same data for different store IDs
- Store switching doesn't trigger new queries

### ❌ Name Resolution Issues
- "Unknown Cashier" appears instead of real names
- Console shows errors fetching app_users
- User IDs displayed instead of names
- Empty or null names in cashier list

## 🔧 Debugging Tips

### Console Monitoring
Open browser console and look for:
- 🔄 **Fetch messages**: Confirm correct store ID
- 💳 **Transaction counts**: Verify data filtering
- 👥 **Cashier names**: Check name resolution
- 🔍 **Sample detection**: Confirm false for real data

### Network Tab
Check for:
- Multiple queries when switching stores
- Correct store_id parameters in requests
- Successful responses from Supabase

### Database Verification
Run these queries to verify test data:
```sql
-- Check test users exist
SELECT user_id, first_name, last_name, store_ids FROM app_users WHERE user_id LIKE 'test-user-%';

-- Check test transactions exist  
SELECT id, store_id, user_id, total FROM transactions WHERE id LIKE 'test-tx-%';

-- Check test shifts exist
SELECT id, store_id, user_id, status FROM shifts WHERE id LIKE 'test-shift-%';
```

## 🧹 Cleanup

After testing, run `cleanup-test-data.sql` to remove all test records:
```sql
DELETE FROM transactions WHERE id LIKE 'test-tx-%';
DELETE FROM shifts WHERE id LIKE 'test-shift-%';  
DELETE FROM app_users WHERE user_id LIKE 'test-user-%';
```

## 📊 Expected vs Actual Results Template

Use this template to document your test results:

```
Store 1 Test Results:
✅/❌ Cashier Count: Expected 2, Got ___
✅/❌ Transaction Count: Expected 4, Got ___
✅/❌ Total Sales: Expected ₱1,576.50, Got ___
✅/❌ Cashier Names: Expected [Juan Dela Cruz, Maria Santos], Got ___
✅/❌ Sample Detection: Expected false, Got ___

Store 2 Test Results:  
✅/❌ Cashier Count: Expected 2, Got ___
✅/❌ Transaction Count: Expected 2, Got ___
✅/❌ Total Sales: Expected ₱795.50, Got ___
✅/❌ Cashier Names: Expected [Ana Rodriguez, Juan Dela Cruz], Got ___
✅/❌ Sample Detection: Expected false, Got ___

Store Switching:
✅/❌ Data changes between stores
✅/❌ Console shows different store IDs
✅/❌ No sample data warnings
✅/❌ UI updates immediately
```

This comprehensive testing will verify that all the cashier report fixes are working correctly!
