
import { supabase } from "@/integrations/supabase/client";
import { ConversionRequest } from "@/types/commissary";
import { toast } from "sonner";
import { validateConversionRequest } from "./conversionValidation";
import { createOutputItem, createConversionRecord, updateInputItemsStock } from "./conversionExecution";

export const executeConversion = async (conversionRequest: ConversionRequest): Promise<boolean> => {
  try {
    console.log('Starting conversion process:', conversionRequest);

    // Get current user
    const { data: userData } = await supabase.auth.getUser();
    const currentUserId = userData.user?.id;

    if (!currentUserId) {
      toast.error('User not authenticated');
      return false;
    }

    // Validate conversion request
    const isValid = await validateConversionRequest(conversionRequest);
    if (!isValid) {
      return false;
    }

    // Create the output item as orderable_item
    const newItem = await createOutputItem(conversionRequest);
    if (!newItem) {
      return false;
    }

    // Create conversion record
    const conversion = await createConversionRecord(newItem, conversionRequest, currentUserId);
    if (!conversion) {
      return false;
    }

    // Update input items stock and create conversion ingredients records
    const stockUpdateSuccess = await updateInputItemsStock(conversionRequest, conversion.id);
    if (!stockUpdateSuccess) {
      return false;
    }

    toast.success(`Successfully converted materials into ${conversionRequest.output_item.name}`);
    return true;

  } catch (error) {
    console.error('Conversion error:', error);
    toast.error('Failed to execute conversion');
    return false;
  }
};
