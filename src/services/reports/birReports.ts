import { supabase } from "@/integrations/supabase/client";
import { XReadingReport, ZReadingReport, DailySalesSummary, VATReport } from "@/types/reports";
import { toast } from "sonner";
import { format } from "date-fns";

// X-Reading Report (current shift/day status)
export async function fetchXReading(
  storeId: string,
  date: string
): Promise<XReadingReport | null> {
  try {
    // Get store information
    const { data: storeData, error: storeError } = await supabase
      .from("stores")
      .select("*")
      .eq("id", storeId)
      .single();

    if (storeError) throw storeError;
    
    // Get active shift information
    const { data: shiftData, error: shiftError } = await supabase
      .from("shifts")
      .select("id, user_id, start_time, starting_cash")
      .eq("store_id", storeId)
      .eq("status", "active")
      .order("start_time", { ascending: false })
      .limit(1)
      .single();

    // If no active shift, return mock data for demo
    if (shiftError) {
      // For demo, create sample data
      return createSampleXReading(storeData);
    }
    
    // Get user information separately since there's no direct relationship
    let cashierName = "Unknown";
    if (shiftData.user_id) {
      // This would require a users table in your database
      // For now we'll use a placeholder
      cashierName = "Cashier #" + shiftData.user_id.substring(0, 5);
    }
    
    // Get transactions for this shift
    const { data: transactions, error: txError } = await supabase
      .from("transactions")
      .select("*")
      .eq("shift_id", shiftData.id)
      .eq("status", "completed");
    
    if (txError) throw txError;
    
    // Calculate totals
    let grossSales = 0;
    let vatableSales = 0;
    let vatExemptSales = 0;
    let vatZeroRatedSales = 0;
    let totalDiscounts = 0;
    let seniorDiscount = 0;
    let pwdDiscount = 0;
    let employeeDiscount = 0;
    let otherDiscounts = 0;
    let netSales = 0;
    let vatAmount = 0;
    let cashPayments = 0;
    let cardPayments = 0;
    let eWalletPayments = 0;

    transactions?.forEach(tx => {
      grossSales += tx.subtotal;
      vatableSales += tx.subtotal - (tx.discount || 0);
      vatAmount += tx.tax;
      totalDiscounts += tx.discount || 0;
      netSales += tx.total;
      
      // Count different discount types
      if (tx.discount_type === 'senior') {
        seniorDiscount += tx.discount || 0;
      } else if (tx.discount_type === 'pwd') {
        pwdDiscount += tx.discount || 0;
      } else if (tx.discount_type === 'employee') {
        employeeDiscount += tx.discount || 0;
      } else if (tx.discount && tx.discount > 0) {
        otherDiscounts += tx.discount;
      }
      
      // Count payment methods
      if (tx.payment_method === 'cash') {
        cashPayments += tx.total;
      } else if (tx.payment_method === 'card') {
        cardPayments += tx.total;
      } else if (tx.payment_method === 'e-wallet') {
        eWalletPayments += tx.total;
      }
    });
    
    // Get receipt numbers
    const receiptNumbers = transactions?.map(tx => tx.receipt_number).sort() || [];
    const beginningReceiptNumber = receiptNumbers[0] || '-';
    const endingReceiptNumber = receiptNumbers[receiptNumbers.length - 1] || '-';

    return {
      storeName: storeData.name,
      storeAddress: storeData.address,
      contactInfo: storeData.phone || storeData.email,
      taxId: storeData.tax_id,
      cashierName,
      terminal: 'Terminal 1',
      beginningReceiptNumber,
      endingReceiptNumber,
      transactionCount: transactions?.length || 0,
      grossSales,
      vatableSales,
      vatExemptSales,
      vatZeroRatedSales,
      totalDiscounts,
      seniorDiscount,
      pwdDiscount,
      employeeDiscount,
      otherDiscounts,
      netSales,
      vatAmount,
      vatExempt: vatExemptSales,
      vatZeroRated: vatZeroRatedSales,
      cashPayments,
      cardPayments,
      eWalletPayments,
      totalPayments: cashPayments + cardPayments + eWalletPayments
    };
  } catch (error) {
    console.error("Error fetching X-Reading:", error);
    toast.error("Failed to generate X-Reading report");
    return null;
  }
}

// Z-Reading Report (end of day)
export async function fetchZReading(
  storeId: string,
  date: string
): Promise<ZReadingReport | null> {
  try {
    // Get store information
    const { data: storeData, error: storeError } = await supabase
      .from("stores")
      .select("*")
      .eq("id", storeId)
      .single();

    if (storeError) throw storeError;
    
    // Get all shifts for the date
    const { data: shifts, error: shiftError } = await supabase
      .from("shifts")
      .select("id, user_id, start_time, starting_cash, ending_cash")
      .eq("store_id", storeId)
      .gte("start_time", `${date}T00:00:00`)
      .lt("start_time", `${date}T23:59:59`);

    // For demo purposes, create sample data if no shifts found
    if (shiftError || !shifts || shifts.length === 0) {
      return createSampleZReading(storeData);
    }
    
    // Get cashier name (would need to get this from users table)
    let cashierName = "Unknown";
    if (shifts.length > 0 && shifts[0].user_id) {
      // This would require a users table in your database
      // For now we'll use a placeholder
      cashierName = "Cashier #" + shifts[0].user_id.substring(0, 5);
    }
    
    // Get all transactions for this date
    const { data: transactions, error: txError } = await supabase
      .from("transactions")
      .select("*")
      .eq("store_id", storeId)
      .eq("status", "completed")
      .gte("created_at", `${date}T00:00:00`)
      .lt("created_at", `${date}T23:59:59`);
    
    if (txError) throw txError;
    
    // Calculate totals (similar to X-reading but for all shifts)
    let grossSales = 0;
    let vatableSales = 0;
    let vatExemptSales = 0;
    let vatZeroRatedSales = 0;
    let totalDiscounts = 0;
    let seniorDiscount = 0;
    let pwdDiscount = 0;
    let employeeDiscount = 0;
    let otherDiscounts = 0;
    let netSales = 0;
    let vatAmount = 0;
    let cashPayments = 0;
    let cardPayments = 0;
    let eWalletPayments = 0;

    transactions?.forEach(tx => {
      grossSales += tx.subtotal;
      vatableSales += tx.subtotal - (tx.discount || 0);
      vatAmount += tx.tax;
      totalDiscounts += tx.discount || 0;
      netSales += tx.total;
      
      // Count different discount types
      if (tx.discount_type === 'senior') {
        seniorDiscount += tx.discount || 0;
      } else if (tx.discount_type === 'pwd') {
        pwdDiscount += tx.discount || 0;
      } else if (tx.discount_type === 'employee') {
        employeeDiscount += tx.discount || 0;
      } else if (tx.discount && tx.discount > 0) {
        otherDiscounts += tx.discount;
      }
      
      // Count payment methods
      if (tx.payment_method === 'cash') {
        cashPayments += tx.total;
      } else if (tx.payment_method === 'card') {
        cardPayments += tx.total;
      } else if (tx.payment_method === 'e-wallet') {
        eWalletPayments += tx.total;
      }
    });
    
    // Get receipt numbers
    const receiptNumbers = transactions?.map(tx => tx.receipt_number).sort() || [];
    const beginningReceiptNumber = receiptNumbers[0] || '-';
    const endingReceiptNumber = receiptNumbers[receiptNumbers.length - 1] || '-';
    
    // Calculate cash drawer info from all shifts
    let beginningCash = 0;
    let actualCash = 0;
    
    shifts.forEach(shift => {
      beginningCash += shift.starting_cash || 0;
      if (shift.ending_cash) {
        actualCash += shift.ending_cash;
      }
    });
    
    const cashSales = cashPayments;
    const cashPayouts = 0; // Would come from expenses/payouts table
    const expectedCash = beginningCash + cashSales - cashPayouts;
    const cashVariance = actualCash - expectedCash;

    return {
      storeName: storeData.name,
      storeAddress: storeData.address,
      contactInfo: storeData.phone || storeData.email,
      taxId: storeData.tax_id,
      storeManager: 'Store Manager',
      cashierName,
      terminal: 'Terminal 1',
      beginningReceiptNumber,
      endingReceiptNumber,
      transactionCount: transactions?.length || 0,
      grossSales,
      vatableSales,
      vatExemptSales,
      vatZeroRatedSales,
      totalRefunds: 0, // Would come from refunds table
      totalDiscounts,
      seniorDiscount,
      pwdDiscount,
      employeeDiscount,
      otherDiscounts,
      netSales,
      vatAmount,
      vatExempt: vatExemptSales,
      vatZeroRated: vatZeroRatedSales,
      cashPayments,
      cardPayments,
      eWalletPayments,
      totalPayments: cashPayments + cardPayments + eWalletPayments,
      beginningCash,
      cashSales,
      cashPayouts,
      expectedCash,
      actualCash,
      cashVariance,
      accumulatedGrossSales: grossSales + 250000, // For demo - would be from accumulated historical data
      accumulatedVAT: vatAmount + 30000 // For demo - would be from accumulated historical data
    };
  } catch (error) {
    console.error("Error fetching Z-Reading:", error);
    toast.error("Failed to generate Z-Reading report");
    return null;
  }
}

// Daily Sales Summary
export async function fetchDailySalesSummary(
  storeId: string,
  date: string
): Promise<DailySalesSummary | null> {
  try {
    // Get all transactions for this date
    const { data: transactions, error: txError } = await supabase
      .from("transactions")
      .select("*")
      .eq("store_id", storeId)
      .eq("status", "completed")
      .gte("created_at", `${date}T00:00:00`)
      .lt("created_at", `${date}T23:59:59`);
    
    if (txError) throw txError;
    
    if (!transactions || transactions.length === 0) {
      // For demo purposes, return sample data
      return createSampleDailySummary();
    }
    
    // Calculate sales by item
    const itemSales: Record<string, { 
      name: string, 
      quantity: number, 
      price: number,
      totalSales: number 
    }> = {};
    
    let totalItemsSold = 0;
    let totalSales = 0;
    
    transactions.forEach(tx => {
      totalSales += tx.total;
      
      const items = typeof tx.items === 'string' ? JSON.parse(tx.items) : tx.items;
      
      items.forEach((item: any) => {
        const itemName = item.name;
        const quantity = item.quantity;
        const unitPrice = item.unitPrice;
        const totalPrice = item.totalPrice;
        
        if (!itemSales[itemName]) {
          itemSales[itemName] = {
            name: itemName,
            quantity: 0,
            price: unitPrice,
            totalSales: 0
          };
        }
        
        itemSales[itemName].quantity += quantity;
        itemSales[itemName].totalSales += totalPrice;
        totalItemsSold += quantity;
      });
    });
    
    // Calculate payment methods
    const paymentMethods: Record<string, number> = {};
    
    transactions.forEach(tx => {
      const method = tx.payment_method;
      if (!paymentMethods[method]) {
        paymentMethods[method] = 0;
      }
      paymentMethods[method] += tx.total;
    });
    
    const paymentMethodsArray = Object.entries(paymentMethods)
      .map(([method, amount]) => ({
        method: method === 'cash' ? 'Cash' : 
                method === 'card' ? 'Card' : 
                method === 'e-wallet' ? 'E-Wallet' : method,
        amount,
        percentage: (amount / totalSales) * 100
      }));

    return {
      totalSales,
      transactionCount: transactions.length,
      totalItemsSold,
      items: Object.values(itemSales).sort((a, b) => b.totalSales - a.totalSales),
      paymentMethods: paymentMethodsArray
    };
  } catch (error) {
    console.error("Error fetching Daily Sales Summary:", error);
    toast.error("Failed to generate Daily Sales Summary");
    return null;
  }
}

// VAT Report
export async function fetchVATReport(
  storeId: string,
  from: string,
  to: string
): Promise<VATReport | null> {
  try {
    // Get all transactions for the date range
    const { data: transactions, error: txError } = await supabase
      .from("transactions")
      .select("*")
      .eq("store_id", storeId)
      .eq("status", "completed")
      .gte("created_at", `${from}T00:00:00`)
      .lte("created_at", `${to}T23:59:59`)
      .order("created_at");
    
    if (txError) throw txError;
    
    if (!transactions || transactions.length === 0) {
      // For demo purposes, return sample data
      return createSampleVATReport(from, to);
    }
    
    // Process transactions for VAT reporting
    const vatTransactions = transactions.map(tx => {
      // Apply simple VAT calculation
      const vatableSales = tx.subtotal - (tx.discount || 0);
      const vatAmount = tx.tax;
      const vatExemptSales = 0; // In a real system, would extract from items with VAT exemption
      const vatZeroRatedSales = 0; // In a real system, would extract from items with zero VAT rate
      
      return {
        date: tx.created_at,
        receiptNumber: tx.receipt_number,
        transactionType: tx.payment_method === 'cash' ? 'CASH SALES' : 'NON-CASH SALES',
        vatableSales,
        vatAmount,
        vatExemptSales,
        vatZeroRatedSales
      };
    });
    
    // Calculate totals
    const totals = vatTransactions.reduce(
      (acc, tx) => {
        return {
          vatableSales: acc.vatableSales + tx.vatableSales,
          vatAmount: acc.vatAmount + tx.vatAmount,
          vatExemptSales: acc.vatExemptSales + tx.vatExemptSales,
          vatZeroRatedSales: acc.vatZeroRatedSales + tx.vatZeroRatedSales
        };
      },
      { vatableSales: 0, vatAmount: 0, vatExemptSales: 0, vatZeroRatedSales: 0 }
    );

    return {
      transactions: vatTransactions,
      totals
    };
  } catch (error) {
    console.error("Error fetching VAT Report:", error);
    toast.error("Failed to generate VAT Report");
    return null;
  }
}

// Helper functions to create sample data for demo purposes
function createSampleXReading(store: any): XReadingReport {
  return {
    storeName: store?.name || 'Demo Store',
    storeAddress: store?.address || '123 Main Street, City',
    contactInfo: store?.phone || '123-456-7890',
    taxId: store?.tax_id || '123-456-789-000',
    cashierName: 'John Doe',
    terminal: 'Terminal 1',
    beginningReceiptNumber: 'R-20250101-0001',
    endingReceiptNumber: 'R-20250101-0035',
    transactionCount: 35,
    grossSales: 12500.00,
    vatableSales: 11160.71,
    vatExemptSales: 0,
    vatZeroRatedSales: 0,
    totalDiscounts: 500.00,
    seniorDiscount: 200.00,
    pwdDiscount: 150.00,
    employeeDiscount: 150.00,
    otherDiscounts: 0,
    netSales: 12000.00,
    vatAmount: 1339.29,
    vatExempt: 0,
    vatZeroRated: 0,
    cashPayments: 8500.00,
    cardPayments: 2500.00,
    eWalletPayments: 1000.00,
    totalPayments: 12000.00
  };
}

function createSampleZReading(store: any): ZReadingReport {
  return {
    storeName: store?.name || 'Demo Store',
    storeAddress: store?.address || '123 Main Street, City',
    contactInfo: store?.phone || '123-456-7890',
    taxId: store?.tax_id || '123-456-789-000',
    storeManager: 'Jane Smith',
    cashierName: 'John Doe',
    terminal: 'Terminal 1',
    beginningReceiptNumber: 'R-20250101-0001',
    endingReceiptNumber: 'R-20250101-0085',
    transactionCount: 85,
    grossSales: 28500.00,
    vatableSales: 25446.43,
    vatExemptSales: 0,
    vatZeroRatedSales: 0,
    totalRefunds: 500.00,
    totalDiscounts: 1200.00,
    seniorDiscount: 500.00,
    pwdDiscount: 350.00,
    employeeDiscount: 350.00,
    otherDiscounts: 0,
    netSales: 26800.00,
    vatAmount: 3053.57,
    vatExempt: 0,
    vatZeroRated: 0,
    cashPayments: 18500.00,
    cardPayments: 6200.00,
    eWalletPayments: 2100.00,
    totalPayments: 26800.00,
    beginningCash: 5000.00,
    cashSales: 18500.00,
    cashPayouts: 1500.00,
    expectedCash: 22000.00,
    actualCash: 21950.00,
    cashVariance: -50.00,
    accumulatedGrossSales: 258500.00,
    accumulatedVAT: 31020.00
  };
}

function createSampleDailySummary(): DailySalesSummary {
  return {
    totalSales: 26800.00,
    transactionCount: 85,
    totalItemsSold: 210,
    items: [
      { name: 'Iced Coffee', quantity: 45, price: 120.00, totalSales: 5400.00 },
      { name: 'Latte', quantity: 38, price: 140.00, totalSales: 5320.00 },
      { name: 'Croissant', quantity: 52, price: 95.00, totalSales: 4940.00 },
      { name: 'Chocolate Cake', quantity: 25, price: 180.00, totalSales: 4500.00 },
      { name: 'Sandwich', quantity: 32, price: 160.00, totalSales: 5120.00 },
      { name: 'Fruit Smoothie', quantity: 18, price: 150.00, totalSales: 2700.00 }
    ],
    paymentMethods: [
      { method: 'Cash', amount: 18500.00, percentage: 69.0 },
      { method: 'Card', amount: 6200.00, percentage: 23.1 },
      { method: 'E-Wallet', amount: 2100.00, percentage: 7.9 }
    ]
  };
}

function createSampleVATReport(from: string, to: string): VATReport {
  // Generate sample transactions for each day in the date range
  const transactions = [];
  const fromDate = new Date(from);
  const toDate = new Date(to);
  let currentDate = fromDate;
  
  let receiptCounter = 1;
  
  while (currentDate <= toDate) {
    const dateStr = format(currentDate, 'yyyy-MM-dd');
    
    // Create 4-6 transactions for each day
    const txCount = 4 + Math.floor(Math.random() * 3);
    
    for (let i = 0; i < txCount; i++) {
      const vatableSales = 1000 + Math.random() * 5000;
      const vatAmount = vatableSales * 0.12;
      
      transactions.push({
        date: dateStr,
        receiptNumber: `R-${format(currentDate, 'yyyyMMdd')}-${String(receiptCounter).padStart(4, '0')}`,
        transactionType: Math.random() > 0.7 ? 'NON-CASH SALES' : 'CASH SALES',
        vatableSales,
        vatAmount,
        vatExemptSales: Math.random() > 0.8 ? Math.random() * 1000 : 0,
        vatZeroRatedSales: Math.random() > 0.9 ? Math.random() * 500 : 0,
      });
      
      receiptCounter++;
    }
    
    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  // Calculate totals
  const totals = transactions.reduce(
    (acc, tx) => {
      return {
        vatableSales: acc.vatableSales + tx.vatableSales,
        vatAmount: acc.vatAmount + tx.vatAmount,
        vatExemptSales: acc.vatExemptSales + tx.vatExemptSales,
        vatZeroRatedSales: acc.vatZeroRatedSales + tx.vatZeroRatedSales
      };
    },
    { vatableSales: 0, vatAmount: 0, vatExemptSales: 0, vatZeroRatedSales: 0 }
  );

  return {
    transactions,
    totals
  };
}
