
import { supabase } from "@/integrations/supabase/client";
import { ProductVariation } from "@/types";
import { toast } from "sonner";

export const fetchProductVariations = async (productId: string): Promise<ProductVariation[]> => {
  try {
    const { data, error } = await supabase
      .from("product_variations")
      .select("*")
      .eq("product_id", productId)
      .eq("is_active", true)
      .order("price");
    
    if (error) throw new Error(error.message);
    
    return data || [];
  } catch (error) {
    console.error("Error fetching product variations:", error);
    toast.error("Failed to load product variations");
    return [];
  }
};
