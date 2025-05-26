/**
 * Script to create test cashier data for verifying the cashier report fixes
 * This will create real transaction data and app_users records to test:
 * 1. Cashier name resolution from app_users table
 * 2. Store-specific data filtering
 * 3. Sample data detection with real names
 * 4. Store switching functionality
 */

// Test data configuration
const TEST_STORES = {
  store1: "a12a8269-5cbc-4a78-bae0-d6f166e1446d", // Robinsons North
  store2: "fd45e07e-7832-4f51-b46b-7ef604359b86"  // Second store
};

const TEST_USERS = [
  {
    user_id: "test-user-001",
    first_name: "Maria",
    last_name: "Santos",
    role: "cashier",
    is_active: true,
    store_ids: [TEST_STORES.store1]
  },
  {
    user_id: "test-user-002", 
    first_name: "Juan",
    last_name: "Dela Cruz",
    role: "cashier",
    is_active: true,
    store_ids: [TEST_STORES.store1, TEST_STORES.store2]
  },
  {
    user_id: "test-user-003",
    first_name: "Ana",
    last_name: "Rodriguez",
    role: "cashier", 
    is_active: true,
    store_ids: [TEST_STORES.store2]
  }
];

const TEST_TRANSACTIONS = [
  // Store 1 transactions
  {
    store_id: TEST_STORES.store1,
    user_id: "test-user-001",
    total: 450.75,
    status: "completed",
    created_at: "2025-05-26T09:30:00Z",
    items: JSON.stringify([
      { name: "Iced Coffee", quantity: 2, price: 120 },
      { name: "Croissant", quantity: 3, price: 70.25 }
    ])
  },
  {
    store_id: TEST_STORES.store1,
    user_id: "test-user-001", 
    total: 280.50,
    status: "completed",
    created_at: "2025-05-26T11:15:00Z",
    items: JSON.stringify([
      { name: "Latte", quantity: 1, price: 140 },
      { name: "Sandwich", quantity: 1, price: 140.50 }
    ])
  },
  {
    store_id: TEST_STORES.store1,
    user_id: "test-user-002",
    total: 650.00,
    status: "completed", 
    created_at: "2025-05-26T14:20:00Z",
    items: JSON.stringify([
      { name: "Cake Slice", quantity: 2, price: 180 },
      { name: "Cappuccino", quantity: 2, price: 145 }
    ])
  },
  {
    store_id: TEST_STORES.store1,
    user_id: "test-user-002",
    total: 195.25,
    status: "completed",
    created_at: "2025-05-26T16:45:00Z", 
    items: JSON.stringify([
      { name: "Muffin", quantity: 3, price: 65.08 }
    ])
  },
  // Store 2 transactions
  {
    store_id: TEST_STORES.store2,
    user_id: "test-user-002",
    total: 320.00,
    status: "completed",
    created_at: "2025-05-26T10:00:00Z",
    items: JSON.stringify([
      { name: "Americano", quantity: 2, price: 110 },
      { name: "Bagel", quantity: 1, price: 100 }
    ])
  },
  {
    store_id: TEST_STORES.store2,
    user_id: "test-user-003",
    total: 475.50,
    status: "completed",
    created_at: "2025-05-26T13:30:00Z",
    items: JSON.stringify([
      { name: "Frappuccino", quantity: 1, price: 165 },
      { name: "Club Sandwich", quantity: 1, price: 210.50 },
      { name: "Cookie", quantity: 2, price: 50 }
    ])
  }
];

const TEST_SHIFTS = [
  // Store 1 shifts
  {
    store_id: TEST_STORES.store1,
    user_id: "test-user-001",
    start_time: "2025-05-26T08:00:00Z",
    end_time: "2025-05-26T16:00:00Z",
    starting_cash: 2000.00,
    ending_cash: 2731.25,
    status: "completed"
  },
  {
    store_id: TEST_STORES.store1,
    user_id: "test-user-002", 
    start_time: "2025-05-26T12:00:00Z",
    end_time: "2025-05-26T20:00:00Z",
    starting_cash: 2500.00,
    ending_cash: 3345.25,
    status: "completed"
  },
  // Store 2 shifts
  {
    store_id: TEST_STORES.store2,
    user_id: "test-user-002",
    start_time: "2025-05-26T09:00:00Z", 
    end_time: "2025-05-26T17:00:00Z",
    starting_cash: 1800.00,
    ending_cash: 2120.00,
    status: "completed"
  },
  {
    store_id: TEST_STORES.store2,
    user_id: "test-user-003",
    start_time: "2025-05-26T13:00:00Z",
    end_time: "2025-05-26T21:00:00Z", 
    starting_cash: 2200.00,
    ending_cash: 2675.50,
    status: "completed"
  }
];

// SQL generation functions
function generateAppUsersSQL() {
  console.log('-- Creating test app_users records');
  console.log('-- These represent real cashiers with proper names');
  
  const insertStatements = TEST_USERS.map(user => {
    const storeIdsArray = `{${user.store_ids.map(id => `"${id}"`).join(',')}}`;
    return `INSERT INTO app_users (user_id, first_name, last_name, role, is_active, store_ids) 
VALUES ('${user.user_id}', '${user.first_name}', '${user.last_name}', '${user.role}', ${user.is_active}, '${storeIdsArray}')
ON CONFLICT (user_id) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active,
  store_ids = EXCLUDED.store_ids;`;
  });
  
  return insertStatements.join('\n\n');
}

function generateTransactionsSQL() {
  console.log('-- Creating test transactions');
  console.log('-- These will test cashier name resolution and store filtering');
  
  const insertStatements = TEST_TRANSACTIONS.map((tx, index) => {
    const txId = `test-tx-${String(index + 1).padStart(3, '0')}`;
    return `INSERT INTO transactions (id, store_id, user_id, total, status, created_at, items)
VALUES ('${txId}', '${tx.store_id}', '${tx.user_id}', ${tx.total}, '${tx.status}', '${tx.created_at}', '${tx.items}')
ON CONFLICT (id) DO UPDATE SET
  store_id = EXCLUDED.store_id,
  user_id = EXCLUDED.user_id,
  total = EXCLUDED.total,
  status = EXCLUDED.status,
  created_at = EXCLUDED.created_at,
  items = EXCLUDED.items;`;
  });
  
  return insertStatements.join('\n\n');
}

function generateShiftsSQL() {
  console.log('-- Creating test shifts');
  console.log('-- These provide attendance data for the cashier report');
  
  const insertStatements = TEST_SHIFTS.map((shift, index) => {
    const shiftId = `test-shift-${String(index + 1).padStart(3, '0')}`;
    return `INSERT INTO shifts (id, store_id, user_id, start_time, end_time, starting_cash, ending_cash, status)
VALUES ('${shiftId}', '${shift.store_id}', '${shift.user_id}', '${shift.start_time}', '${shift.end_time}', ${shift.starting_cash}, ${shift.ending_cash}, '${shift.status}')
ON CONFLICT (id) DO UPDATE SET
  store_id = EXCLUDED.store_id,
  user_id = EXCLUDED.user_id,
  start_time = EXCLUDED.start_time,
  end_time = EXCLUDED.end_time,
  starting_cash = EXCLUDED.starting_cash,
  ending_cash = EXCLUDED.ending_cash,
  status = EXCLUDED.status;`;
  });
  
  return insertStatements.join('\n\n');
}

function generateCleanupSQL() {
  return `-- Cleanup test data (run this to remove test data)
DELETE FROM transactions WHERE id LIKE 'test-tx-%';
DELETE FROM shifts WHERE id LIKE 'test-shift-%';
DELETE FROM app_users WHERE user_id LIKE 'test-user-%';`;
}

function generateExpectedResults() {
  console.log('\n=== EXPECTED RESULTS AFTER INSERTING TEST DATA ===\n');
  
  console.log('📊 Store 1 (a12a8269-5cbc-4a78-bae0-d6f166e1446d):');
  console.log('  Cashiers: Maria Santos, Juan Dela Cruz');
  console.log('  Transactions: 4 total');
  console.log('  Total Sales: ₱1,576.50');
  console.log('  Maria Santos: 2 transactions, ₱731.25');
  console.log('  Juan Dela Cruz: 2 transactions, ₱845.25');
  
  console.log('\n📊 Store 2 (fd45e07e-7832-4f51-b46b-7ef604359b86):');
  console.log('  Cashiers: Juan Dela Cruz, Ana Rodriguez');
  console.log('  Transactions: 2 total');
  console.log('  Total Sales: ₱795.50');
  console.log('  Juan Dela Cruz: 1 transaction, ₱320.00');
  console.log('  Ana Rodriguez: 1 transaction, ₱475.50');
  
  console.log('\n🔍 Sample Data Detection:');
  console.log('  Should return FALSE (real data detected)');
  console.log('  Names: Maria Santos, Juan Dela Cruz, Ana Rodriguez');
  console.log('  Avatars: ui-avatars.com (not pravatar.cc)');
  
  console.log('\n🔄 Store Switching Test:');
  console.log('  Switch between stores should show different cashiers');
  console.log('  Different transaction counts and sales totals');
  console.log('  No sample data warnings');
}

// Main execution
function generateTestData() {
  console.log('🧪 CASHIER REPORT TEST DATA GENERATOR');
  console.log('=====================================\n');
  
  console.log('Copy and paste the following SQL into your database:\n');
  
  console.log(generateAppUsersSQL());
  console.log('\n');
  console.log(generateTransactionsSQL());
  console.log('\n');
  console.log(generateShiftsSQL());
  console.log('\n');
  console.log(generateCleanupSQL());
  
  generateExpectedResults();
  
  console.log('\n📋 TESTING STEPS:');
  console.log('1. Run the SQL statements above in your database');
  console.log('2. Navigate to Reports > Cashier Performance');
  console.log('3. Set date to May 26th, 2025 (or "Today" if that\'s the date)');
  console.log('4. Switch between the two stores');
  console.log('5. Verify different cashier names and data appear');
  console.log('6. Check console for debug messages');
  console.log('7. Confirm no sample data warnings appear');
  console.log('8. Run cleanup SQL when done testing');
}

// Export for Node.js or run in browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    generateTestData,
    generateAppUsersSQL,
    generateTransactionsSQL,
    generateShiftsSQL,
    generateCleanupSQL,
    TEST_STORES,
    TEST_USERS,
    TEST_TRANSACTIONS,
    TEST_SHIFTS
  };
} else {
  generateTestData();
}
