
import { supabase } from "@/integrations/supabase/client";
import { CashierReport } from "@/types/reports";

interface CashierDataRecord {
  userId: string;
  name: string | null;
  transactionCount: number;
  totalSales: number;
  transactionTimes: number[];
}

export async function processAttendanceData(
  shifts: any[],
  cashierData: Record<string, CashierDataRecord>
): Promise<CashierReport['attendance']> {
  // Process shifts data to get attendance information
  const attendanceData: CashierReport['attendance'] = [];
  
  if (shifts && shifts.length > 0) {
    for (const shift of shifts) {
      // Extract cashier information
      let cashierName = "Unknown";
      let cashierId = shift.cashier_id || shift.user_id;
      
      // Try to get name from the cashier object if it exists
      if (shift.cashier && typeof shift.cashier === 'object') {
        if ('first_name' in shift.cashier && 'last_name' in shift.cashier) {
          const cashierObj = shift.cashier as { first_name?: string; last_name?: string };
          if (cashierObj.first_name && cashierObj.last_name) {
            cashierName = `${cashierObj.first_name} ${cashierObj.last_name}`;
          }
        }
      }
      
      // If we couldn't get the name from the cashier relation, try to find it in our cashier data
      if (cashierName === "Unknown" && cashierId) {
        const foundCashier = Object.values(cashierData).find(c => c.userId === cashierId);
        if (foundCashier && foundCashier.name) {
          cashierName = foundCashier.name;
        }
        
        // If still not found, try to get it from cashiers table
        if (cashierName === "Unknown") {
          const { data: cashierInfo } = await supabase
            .from("cashiers")
            .select("first_name, last_name")
            .eq("user_id", cashierId)
            .single();
            
          if (cashierInfo) {
            cashierName = `${cashierInfo.first_name} ${cashierInfo.last_name}`;
          }
        }
      }
      
      // Add to attendance data
      attendanceData.push({
        name: cashierName,
        userId: cashierId || "",
        startTime: shift.start_time,
        endTime: shift.end_time || null,
        startPhoto: shift.start_photo || null,
        endPhoto: shift.end_photo || null,
        startingCash: shift.starting_cash || 0,
        endingCash: shift.ending_cash || null,
      });
    }
  }
  
  return attendanceData;
}
