
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DeploymentResult } from "./types";

export const deployRecipeToStores = async (
  templateId: string, 
  storeIds: string[], 
  deployedBy: string
): Promise<DeploymentResult[]> => {
  try {
    const results: DeploymentResult[] = [];
    
    for (const storeId of storeIds) {
      try {
        const { data: template } = await supabase
          .from('recipes')
          .select('*')
          .eq('id', templateId)
          .single();

        if (template) {
          const { error } = await supabase
            .from('recipes')
            .insert({
              ...template,
              id: undefined,
              store_id: storeId,
              created_at: undefined,
              updated_at: undefined
            });

          if (error) throw error;
          results.push({ store_id: storeId, status: 'deployed', message: 'Success' });
        }
      } catch (error) {
        results.push({ store_id: storeId, status: 'failed', message: 'Failed to deploy' });
      }
    }

    toast.success(`Recipe deployed to ${results.filter(r => r.status === 'deployed').length} stores`);
    return results;
  } catch (error: any) {
    console.error('Error deploying recipe:', error);
    toast.error('Failed to deploy recipe');
    return [];
  }
};

export const getRecipeDeployments = async (templateId?: string): Promise<any[]> => {
  try {
    return [];
  } catch (error: any) {
    console.error('Error fetching recipe deployments:', error);
    return [];
  }
};
