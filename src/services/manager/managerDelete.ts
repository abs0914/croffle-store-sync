
import { supabase } from "@/integrations/supabase/client";

export async function deleteManager(id: string) {
  try {
    const { error } = await supabase
      .from('managers')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting manager:', error);
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error('Error in deleteManager:', error);
    throw error;
  }
}
