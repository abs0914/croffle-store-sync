import { supabase } from "@/integrations/supabase/client";

export async function closeActiveShift(userId: string, endingCash?: number) {
  try {
    console.log('🔄 Calling close-shift function for user:', userId);
    
    const { data, error } = await supabase.functions.invoke('close-shift', {
      body: {
        userId,
        endingCash
      }
    });

    if (error) {
      console.error('❌ Error calling close-shift function:', error);
      throw error;
    }

    console.log('✅ Shift closed successfully:', data);
    return data;
  } catch (error) {
    console.error('❌ Failed to close shift:', error);
    throw error;
  }
}