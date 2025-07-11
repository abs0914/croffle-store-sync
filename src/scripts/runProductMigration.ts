import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MigrationResult {
  migrated_count: number;
  skipped_count: number;
  error_count: number;
  details: string[];
}

interface DeploymentResult {
  deployed_count: number;
  error_count: number;
  details: string[];
}

export const runProductMigration = async (): Promise<{
  success: boolean;
  migrationResult?: MigrationResult;
  deploymentResult?: DeploymentResult;
  error?: string;
}> => {
  try {
    console.log("Starting product catalog migration...");

    // Step 1: Migrate product_catalog to products
    const { data: migrationData, error: migrationError } = await supabase
      .rpc('migrate_product_catalog_to_products');

    if (migrationError) {
      console.error("Migration error:", migrationError);
      toast.error(`Migration failed: ${migrationError.message}`);
      return { success: false, error: migrationError.message };
    }

    const migrationResult = migrationData[0] as MigrationResult;
    console.log("Migration completed:", migrationResult);

    // Step 2: Deploy products to all stores
    const { data: deploymentData, error: deploymentError } = await supabase
      .rpc('deploy_products_to_all_stores');

    if (deploymentError) {
      console.error("Deployment error:", deploymentError);
      toast.error(`Deployment failed: ${deploymentError.message}`);
      return { 
        success: false, 
        migrationResult,
        error: deploymentError.message 
      };
    }

    const deploymentResult = deploymentData[0] as DeploymentResult;
    console.log("Deployment completed:", deploymentResult);

    // Show success message
    const totalMigrated = migrationResult.migrated_count;
    const totalDeployed = deploymentResult.deployed_count;
    const totalErrors = migrationResult.error_count + deploymentResult.error_count;

    if (totalErrors === 0) {
      toast.success(
        `Migration successful! Migrated ${totalMigrated} products and deployed ${totalDeployed} products to all stores.`
      );
    } else {
      toast.warning(
        `Migration completed with ${totalErrors} errors. Migrated ${totalMigrated} products and deployed ${totalDeployed} products.`
      );
    }

    return {
      success: true,
      migrationResult,
      deploymentResult
    };

  } catch (error) {
    console.error("Unexpected error during migration:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    toast.error(`Migration failed: ${errorMessage}`);
    return { success: false, error: errorMessage };
  }
};

// Export for use in other files
export default runProductMigration;