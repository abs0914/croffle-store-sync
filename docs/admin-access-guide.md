# Admin Access Guide for Stock and Production Users

## How to Access Admin Sections

Now that the permission system has been updated, `stock_user` and `production_user` roles can access admin sections through multiple entry points:

### 1. 📱 Mobile Sidebar (Recommended)
**For Mobile Users:**
1. Tap the hamburger menu (☰) in the top-left corner
2. Look for the user dropdown with your email
3. Tap your email to open the dropdown menu
4. Select **"Admin Panel"** with the shield (🛡️) icon
5. You'll be taken to `/admin` with access to your permitted sections

### 2. ⚙️ Settings Page
**From Any Device:**
1. Navigate to **Settings** from the main navigation
2. In the top-right corner, click the **"Admin Panel"** button
3. This will take you directly to the admin dashboard

### 3. 🖥️ Desktop Sidebar
**For Desktop Users:**
1. Click the **Menu** button in the sidebar
2. In the user dropdown (shows your email), select **"Admin Panel"**
3. Direct access to admin sections

## 📋 Available Admin Sections by Role

### Charm.inventory@thecrofflestore.com (Stock User)
**Can Access:**
- ✅ Admin Dashboard (`/admin`)
- ✅ Commissary Inventory (`/admin/commissary-inventory`) 
- ✅ Production Management (`/admin/production-management`)
- ✅ Order Management (`/admin/order-management`)
- ✅ Expenses (`/admin/expenses`) 
- ✅ Reports (`/admin/reports`)
- ✅ Recipe Management (`/admin/recipes`)

**Cannot Access:**
- ❌ Stores Management
- ❌ User Management  
- ❌ Add-ons Management

### Kathrence.purchasing@thecrofflestore.com (Production User)
**Can Access:**
- ✅ Admin Dashboard (`/admin`)
- ✅ Commissary Inventory (`/admin/commissary-inventory`)
- ✅ Production Management (`/admin/production-management`) 
- ✅ Recipe Management (`/admin/recipes`)

**Cannot Access:**
- ❌ Order Management
- ❌ Expenses
- ❌ Reports
- ❌ Stores Management
- ❌ User Management
- ❌ Add-ons Management

## 🚦 Navigation Behavior
- **Smooth Access:** Users with admin permissions will see admin navigation options automatically
- **Section Restriction:** If you try to access a section you don't have permission for, you'll see a clear message explaining the restriction
- **Fallback Navigation:** Clear "Back to Admin" and "Back to Dashboard" buttons for easy navigation
- **Role Display:** Your current role is displayed in access denied messages for transparency

## 🔧 Technical Changes Made
1. **Granular Permissions:** Replaced admin-only access with section-specific permissions
2. **Role-Based Menus:** Admin sidebar shows only sections you have access to
3. **Enhanced Security:** Maintains principle of least privilege while providing necessary access
4. **Backwards Compatibility:** Existing admin users retain full access

The users can now access the admin sections they need for their daily work while maintaining proper security boundaries!