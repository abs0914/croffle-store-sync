import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DeploymentResult {
  success: boolean;
  message: string;
  deployed_products: Array<{
    store_name: string;
    products_added: string[];
    categories_created: string[];
  }>;
  errors: string[];
}

export const deployCrofflesToAllStores = async (): Promise<DeploymentResult> => {
  try {
    console.log('🚀 Starting croffle deployment to all stores...');
    
    const { data, error } = await supabase.functions.invoke('deploy-croffles', {
      body: {}
    });

    if (error) {
      throw new Error(`Deployment function error: ${error.message}`);
    }

    const result = data as DeploymentResult;
    
    if (result.success) {
      toast.success(result.message);
      
      // Show detailed success info
      const totalProducts = result.deployed_products.reduce((sum, store) => sum + store.products_added.length, 0);
      const storeCount = result.deployed_products.filter(store => store.products_added.length > 0).length;
      
      if (totalProducts > 0) {
        toast.success(`Successfully deployed ${totalProducts} croffle products to ${storeCount} stores! 🎉`);
      }
      
      // Show any warnings
      if (result.errors.length > 0) {
        console.warn('Deployment completed with some warnings:', result.errors);
        toast.warning(`Deployment completed with ${result.errors.length} warnings. Check console for details.`);
      }
    } else {
      toast.error(result.message);
      console.error('Deployment errors:', result.errors);
    }

    return result;

  } catch (error) {
    console.error('❌ Croffle deployment service error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown deployment error';
    
    toast.error(`Deployment failed: ${errorMessage}`);
    
    return {
      success: false,
      message: errorMessage,
      deployed_products: [],
      errors: [errorMessage]
    };
  }
};