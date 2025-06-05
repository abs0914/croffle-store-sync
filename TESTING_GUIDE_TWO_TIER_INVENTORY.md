# Two-Tier Inventory System - Testing Guide

## 🧪 Pre-Testing Setup

### Database Migration
1. **Apply migrations** in order:
   ```sql
   -- Run these migrations in your Supabase dashboard
   -- 1. Enhanced inventory tables (already exists, updated)
   -- 2. Two-tier system tables (new)
   ```

2. **Verify tables created**:
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN (
     'commissary_inventory', 
     'inventory_conversions', 
     'suppliers'
   );
   ```

### User Role Setup
1. **Create test users** with different roles:
   - Admin user: `admin@test.com`
   - Store manager: `manager@test.com`
   - Cashier: `cashier@test.com`

2. **Assign roles** in `app_users` table:
   ```sql
   UPDATE app_users SET role = 'admin' WHERE email = 'admin@test.com';
   UPDATE app_users SET role = 'manager' WHERE email = 'manager@test.com';
   UPDATE app_users SET role = 'cashier' WHERE email = 'cashier@test.com';
   ```

## 🔐 Access Control Testing

### Test 1: Admin Access Verification
**Login as Admin User**

1. **Navigate to main menu** - Should see:
   - ✅ "Commissary Inventory" menu item
   - ✅ "Inventory Conversion" menu item
   - ✅ All standard menu items

2. **Access Commissary Inventory** (`/commissary-inventory`):
   - ✅ Page loads successfully
   - ✅ Can view commissary items
   - ✅ Can add new commissary items
   - ✅ Can filter by category, stock level, supplier

3. **Access Inventory Conversion** (`/inventory-conversion`):
   - ✅ Page loads successfully
   - ✅ Can see conversion form
   - ✅ Can view conversion history
   - ✅ Can perform conversions

### Test 2: Store Manager Access Verification
**Login as Manager User**

1. **Navigate to main menu** - Should NOT see:
   - ❌ "Commissary Inventory" menu item
   - ❌ "Inventory Conversion" menu item

2. **Direct URL access test**:
   - Navigate to `/commissary-inventory` - Should show access denied
   - Navigate to `/inventory-conversion` - Should show access denied

3. **Store inventory access**:
   - ✅ Can access `/inventory/stock`
   - ✅ Can view store inventory items
   - ✅ Can manage store inventory

### Test 3: Cashier Access Verification
**Login as Cashier User**

1. **Menu access** - Should NOT see admin-only items
2. **Store inventory** - Should have read-only access
3. **Direct URL access** - Should be denied for admin features

## 📦 Commissary Inventory Testing

### Test 4: Commissary Item Management
**Login as Admin**

1. **Add new commissary item**:
   - Navigate to Commissary Inventory
   - Click "Add Raw Material"
   - Fill form with test data:
     ```
     Name: Test Raw Cocoa
     Category: Raw Materials
     Current Stock: 100
     Min Threshold: 20
     Unit: kg
     Unit Cost: 15.50
     ```
   - ✅ Item should be created successfully
   - ✅ Should appear in inventory list

2. **Filter testing**:
   - ✅ Filter by category works
   - ✅ Filter by stock level works
   - ✅ Search functionality works
   - ✅ Supplier filter works

3. **Stock level indicators**:
   - ✅ Good stock shows green indicator
   - ✅ Low stock shows yellow indicator
   - ✅ Out of stock shows red indicator

### Test 5: Commissary Stock Management
1. **Stock adjustment**:
   - Edit a commissary item
   - Change stock quantity
   - ✅ Stock should update correctly
   - ✅ Stock level indicator should update

## 🔄 Inventory Conversion Testing

### Test 6: Basic Conversion Process
**Login as Admin**

1. **Perform conversion**:
   - Navigate to Inventory Conversion
   - Select a commissary item with available stock
   - Enter raw material quantity: `10`
   - Enter finished goods quantity: `50`
   - Select existing store inventory item OR create new one
   - Add notes: "Test conversion"
   - Click "Convert Materials"

2. **Verify conversion results**:
   - ✅ Commissary stock should decrease by 10
   - ✅ Store inventory should increase by 50
   - ✅ Conversion should appear in history
   - ✅ Conversion ratio should be calculated (5.0)

### Test 7: Create New Store Item During Conversion
1. **Conversion with new item**:
   - Select commissary item
   - Choose "Create New Item" for target
   - Enter new item name: "Processed Cocoa Powder"
   - Enter unit: "portions"
   - Complete conversion
   - ✅ New store inventory item should be created
   - ✅ Conversion should complete successfully

### Test 8: Conversion History
1. **View conversion history**:
   - ✅ Recent conversions should be displayed
   - ✅ Should show commissary item → store item
   - ✅ Should show quantities and ratios
   - ✅ Should show conversion dates
   - ✅ Should show notes if provided

## 🍽️ Menu Management Integration Testing

### Test 9: Recipe Creation with Store Inventory
**Login as any user with store access**

1. **Create new recipe**:
   - Navigate to Inventory → Management tab
   - Click "Add Recipe"
   - Add recipe details
   - Add ingredients - should only show store inventory items
   - ✅ Only store inventory items appear in ingredient selection
   - ✅ Commissary items should NOT appear
   - ✅ Recipe should save successfully

2. **Edit existing recipe**:
   - ✅ Ingredient selection limited to store inventory
   - ✅ No commissary items visible

### Test 10: Menu Item Creation
1. **Create menu item with recipe**:
   - ✅ Recipe ingredients should be from store inventory only
   - ✅ Cost calculation based on store inventory costs

## 🛒 Order Management Integration Testing

### Test 11: Purchase Order Creation
**Login as Manager or Admin**

1. **Create purchase order**:
   - Navigate to Order Management
   - Create new purchase order
   - Add items - should only show store inventory
   - ✅ Only store inventory items appear
   - ✅ Commissary items should NOT appear
   - ✅ Order should be created successfully

2. **Order item selection**:
   - ✅ Dropdown shows store inventory only
   - ✅ No raw materials from commissary

## 🔍 Data Integrity Testing

### Test 12: Store Data Isolation
**Test with multiple stores**

1. **Create items in different stores**:
   - Login as admin
   - Switch to Store A
   - Create store inventory item
   - Switch to Store B
   - ✅ Store A's items should not appear in Store B
   - ✅ Each store sees only their own inventory

2. **Conversion isolation**:
   - Perform conversion for Store A
   - Switch to Store B
   - ✅ Store B should not see Store A's conversions
   - ✅ Admin should see all conversions

### Test 13: Database Constraint Testing
1. **Test referential integrity**:
   - Try to delete a commissary item used in conversions
   - ✅ Should prevent deletion or handle gracefully
   - Try to delete a store item used in recipes
   - ✅ Should prevent deletion or handle gracefully

## 🚨 Error Handling Testing

### Test 14: Insufficient Stock Conversion
1. **Attempt conversion with insufficient stock**:
   - Select commissary item with low stock
   - Try to convert more than available
   - ✅ Should show error message
   - ✅ Should prevent conversion
   - ✅ Stock levels should remain unchanged

### Test 15: Invalid Access Attempts
1. **Direct URL access by unauthorized users**:
   - Login as cashier
   - Navigate directly to `/commissary-inventory`
   - ✅ Should show access denied message
   - ✅ Should not expose any commissary data

### Test 16: Form Validation
1. **Test form validation**:
   - Try to create commissary item with empty name
   - Try to create conversion with zero quantities
   - ✅ Should show appropriate validation errors
   - ✅ Should prevent submission

## 📊 Performance Testing

### Test 17: Large Dataset Performance
1. **Create multiple items**:
   - Add 50+ commissary items
   - Add 100+ store inventory items
   - Perform 20+ conversions
   - ✅ Pages should load within reasonable time
   - ✅ Filtering should be responsive
   - ✅ Search should be fast

## ✅ Test Results Checklist

### Access Control
- [ ] Admin can access all features
- [ ] Store users cannot access commissary features
- [ ] Direct URL access properly restricted
- [ ] Role-based menu rendering works

### Commissary Management
- [ ] Can create/edit/delete commissary items
- [ ] Stock level indicators work correctly
- [ ] Filtering and search function properly
- [ ] Supplier integration works

### Inventory Conversion
- [ ] Basic conversion process works
- [ ] Stock levels update correctly
- [ ] Conversion history is accurate
- [ ] New store items can be created during conversion

### Integration Testing
- [ ] Menu management uses only store inventory
- [ ] Order management uses only store inventory
- [ ] Recipe creation restricted to store items
- [ ] Data isolation between stores works

### Error Handling
- [ ] Insufficient stock prevents conversion
- [ ] Unauthorized access is blocked
- [ ] Form validation works properly
- [ ] Error messages are clear and helpful

## 🐛 Common Issues & Solutions

### Issue: "Access Denied" for Admin Users
**Solution**: Check user role in `app_users` table, ensure role is 'admin' or 'owner'

### Issue: Commissary Items Not Loading
**Solution**: Verify RLS policies are applied correctly, check database permissions

### Issue: Conversion Fails Silently
**Solution**: Check browser console for errors, verify commissary stock levels

### Issue: Store Inventory Not Showing in Recipes
**Solution**: Ensure store is selected, check inventory_stock table has items for that store

## 📞 Support

If tests fail or issues are encountered:
1. Check browser console for JavaScript errors
2. Verify database migration completion
3. Confirm user roles are properly assigned
4. Review RLS policies in Supabase dashboard
5. Check network connectivity and API responses

## 🎨 UI Component Testing

### Test 18: Commissary Inventory UI Components
**Login as Admin**

1. **Add Commissary Item Dialog**:
   - Click "Add Raw Material" button
   - ✅ Dialog opens with all required fields
   - ✅ Form validation works (required fields)
   - ✅ Supplier dropdown populates correctly
   - ✅ Category selection works
   - ✅ Unit selection works
   - ✅ Form submission creates item successfully

2. **Edit Commissary Item Dialog**:
   - Click edit button on any commissary item
   - ✅ Dialog opens with pre-filled data
   - ✅ Current stock field is disabled (read-only)
   - ✅ Changes save successfully
   - ✅ Cancel button works without saving

3. **Stock Adjustment Dialog**:
   - Click stock adjustment button on any item
   - ✅ Dialog shows current stock level
   - ✅ Adjustment type buttons work (increase/decrease/set)
   - ✅ Quantity validation works
   - ✅ New stock level preview updates correctly
   - ✅ Reason field is required
   - ✅ Stock adjustment saves successfully

4. **Delete Confirmation Dialog**:
   - Click delete button on any item
   - ✅ Confirmation dialog appears
   - ✅ Must type "DELETE" to confirm
   - ✅ Warning message shows item details
   - ✅ Cancel button works
   - ✅ Delete confirmation works

### Test 19: Inventory Conversion UI Components
**Login as Admin**

1. **Conversion Form**:
   - ✅ Commissary item dropdown shows available items with stock
   - ✅ Raw material quantity validation works
   - ✅ Finished goods quantity validation works
   - ✅ Target inventory selection works
   - ✅ Create new item option works
   - ✅ Notes field accepts input
   - ✅ Convert button enables/disables correctly

2. **Conversion History**:
   - ✅ Recent conversions display correctly
   - ✅ Shows commissary item → store item
   - ✅ Displays quantities and dates
   - ✅ Shows conversion notes

### Test 20: Responsive Design Testing
1. **Mobile View (< 768px)**:
   - ✅ Navigation menu collapses properly
   - ✅ Tables become scrollable
   - ✅ Dialogs fit screen properly
   - ✅ Form fields stack vertically

2. **Tablet View (768px - 1024px)**:
   - ✅ Grid layouts adjust appropriately
   - ✅ Sidebar navigation works
   - ✅ Dialogs are properly sized

3. **Desktop View (> 1024px)**:
   - ✅ Full layout displays correctly
   - ✅ All components are properly spaced
   - ✅ Dialogs are centered and sized appropriately

### Test 21: Error Handling UI
1. **Network Errors**:
   - Disconnect internet
   - Try to load commissary inventory
   - ✅ Error message displays
   - ✅ Loading states handle gracefully

2. **Validation Errors**:
   - Try to submit forms with invalid data
   - ✅ Field-level validation messages appear
   - ✅ Form submission is prevented
   - ✅ Error messages are clear and helpful

3. **Permission Errors**:
   - Login as non-admin user
   - Try to access admin URLs directly
   - ✅ Access denied messages display
   - ✅ User is redirected appropriately

## 🔧 Legacy Cleanup Verification

### Test 22: Terminology Consistency
1. **Check all pages for consistent terminology**:
   - ✅ "Store Inventory" or "Store Inventory Stocks" (not just "Inventory")
   - ✅ "Commissary Inventory" for raw materials
   - ✅ "Finished ingredients" vs "raw materials" distinction
   - ✅ Clear separation in descriptions and help text

2. **Navigation Menu**:
   - ✅ Menu items clearly labeled
   - ✅ Admin-only items hidden for non-admins
   - ✅ Tooltips and descriptions are accurate

### Test 23: Component Consolidation
1. **Verify no duplicate functionality**:
   - ✅ Only one inventory management system for store items
   - ✅ No conflicting services or components
   - ✅ Consistent data sources throughout

2. **Service Layer Consistency**:
   - ✅ All store inventory uses `inventory_stock` table
   - ✅ All commissary inventory uses `commissary_inventory` table
   - ✅ No legacy `inventory_items` references in active code

## ✅ Complete Test Results Checklist

### Access Control & Security
- [ ] Admin can access all features
- [ ] Store users cannot access commissary features
- [ ] Direct URL access properly restricted
- [ ] Role-based menu rendering works
- [ ] Data isolation between stores works

### Commissary Management
- [ ] Can create/edit/delete commissary items
- [ ] Stock level indicators work correctly
- [ ] Filtering and search function properly
- [ ] Supplier integration works
- [ ] Stock adjustments work with audit trail

### Inventory Conversion
- [ ] Basic conversion process works
- [ ] Stock levels update correctly
- [ ] Conversion history is accurate
- [ ] New store items can be created during conversion
- [ ] Validation prevents invalid conversions

### Integration Testing
- [ ] Menu management uses only store inventory
- [ ] Order management uses only store inventory
- [ ] Recipe creation restricted to store items
- [ ] Purchase orders work with store inventory

### UI/UX Testing
- [ ] All dialogs open and close properly
- [ ] Form validation works correctly
- [ ] Loading states display appropriately
- [ ] Error messages are clear and helpful
- [ ] Responsive design works on all screen sizes

### Error Handling
- [ ] Insufficient stock prevents conversion
- [ ] Unauthorized access is blocked
- [ ] Form validation works properly
- [ ] Network errors are handled gracefully
- [ ] Permission errors show appropriate messages

### Legacy Cleanup
- [ ] Terminology is consistent throughout
- [ ] No duplicate or conflicting components
- [ ] Service layer uses correct data sources
- [ ] Navigation and help text are accurate

## 🎉 Testing Complete

Once all tests pass, the two-tier inventory system with complete UI components is ready for production use!
