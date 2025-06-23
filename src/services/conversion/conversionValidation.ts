
import { supabase } from "@/integrations/supabase/client";
import { ConversionRequest } from "@/types/commissary";
import { toast } from "sonner";
import { VALID_UNITS, UNIT_MAPPING } from "./conversionConstants";

export const normalizeUnit = (unit: string): string => {
  const lowerUnit = unit.toLowerCase().trim();
  return UNIT_MAPPING[lowerUnit] || unit;
};

export const validateConversionRequest = async (conversionRequest: ConversionRequest): Promise<boolean> => {
  // Validate input items have sufficient stock
  for (const inputItem of conversionRequest.input_items) {
    const { data: item, error } = await supabase
      .from('commissary_inventory')
      .select('current_stock, name')
      .eq('id', inputItem.commissary_item_id)
      .single();

    if (error) {
      toast.error(`Error checking stock for item: ${error.message}`);
      return false;
    }

    if (item.current_stock < inputItem.quantity) {
      toast.error(`Insufficient stock for ${item.name}. Available: ${item.current_stock}, Required: ${inputItem.quantity}`);
      return false;
    }
  }

  // Normalize and validate the output item unit
  const normalizedUnit = normalizeUnit(conversionRequest.output_item.uom);
  
  console.log('Original unit:', conversionRequest.output_item.uom);
  console.log('Normalized unit:', normalizedUnit);

  if (!VALID_UNITS.includes(normalizedUnit)) {
    toast.error(`Invalid unit: ${conversionRequest.output_item.uom}. Please use a valid unit from the dropdown.`);
    return false;
  }

  return true;
};
