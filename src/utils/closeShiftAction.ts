import { closeActiveShift } from "./shiftUtils";

// Function to close the July 24th shift for the cashier
export async function closeOldShift() {
  const cashierUserId = 'c21d1e53-8379-454c-b97e-d51d1ee76c99'; // rbnorth.cashier@croffle.com
  
  try {
    console.log('🔄 Attempting to close old active shift...');
    const result = await closeActiveShift(cashierUserId);
    console.log('✅ Old shift closed successfully:', result);
    return result;
  } catch (error) {
    console.error('❌ Failed to close old shift:', error);
    throw error;
  }
}