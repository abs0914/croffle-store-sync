
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
  cashierData: Record<string, CashierDataRecord>,
  includeStoreName = false
): Promise<CashierReport['attendance']> {
  // Process shifts data to get attendance information
  const attendanceData: CashierReport['attendance'] = [];

  if (shifts && shifts.length > 0) {
    for (const shift of shifts) {
      // Extract cashier information
      let cashierName = "Unknown";
      let cashierId = shift.cashier_id || shift.user_id;

      // We'll fetch cashier names separately since we can't join directly
      // For now, use the name from cashierData if available
      if (cashierData[cashierId] && cashierData[cashierId].name) {
        cashierName = cashierData[cashierId].name;
      }

      // If we couldn't get the name from the relation, try to find it in our cashier data
      if (cashierName === "Unknown" && cashierId) {
        const foundCashier = Object.values(cashierData).find(c => c.userId === cashierId);
        if (foundCashier && foundCashier.name) {
          cashierName = foundCashier.name;
        }

        // If still not found, try to get it from app_users table
        if (cashierName === "Unknown") {
          try {
            const { data: userInfo } = await supabase
              .from("app_users")
              .select("first_name, last_name")
              .eq("user_id", cashierId)
              .single();

            if (userInfo) {
              cashierName = `${userInfo.first_name || ''} ${userInfo.last_name || ''}`.trim() || 'Unknown';
            }
          } catch (error) {
            console.error("Error fetching user info:", error);
          }
        }
      }

      // Get store name if requested (for multi-store reports)
      let storeName = null;
      if (includeStoreName && shift.store_id) {
        try {
          const { data: storeInfo } = await supabase
            .from("stores")
            .select("name")
            .eq("id", shift.store_id)
            .single();

          if (storeInfo) {
            storeName = storeInfo.name;
          }
        } catch (error) {
          console.error("Error fetching store name:", error);
        }
      }

      // Add to attendance data
      attendanceData.push({
        name: cashierName || "Unknown",
        userId: cashierId || "",
        storeId: shift.store_id || "",
        storeName: storeName || "",
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
