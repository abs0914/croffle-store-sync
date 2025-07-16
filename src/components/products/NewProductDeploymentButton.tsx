import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import { deployNewProducts } from "@/scripts/deployNewProducts";
import { toast } from "sonner";
interface NewProductDeploymentButtonProps {
  onDeploymentComplete?: () => void;
}
export const NewProductDeploymentButton: React.FC<NewProductDeploymentButtonProps> = ({
  onDeploymentComplete
}) => {
  const [isDeploying, setIsDeploying] = useState(false);
  const handleDeployment = async () => {
    if (isDeploying) return;
    setIsDeploying(true);
    try {
      const result = await deployNewProducts();
      if (result.success && onDeploymentComplete) {
        onDeploymentComplete();
      }
    } catch (error) {
      console.error("Deployment error:", error);
      toast.error("Deployment failed with unexpected error");
    } finally {
      setIsDeploying(false);
    }
  };
  return (
    <Button 
      onClick={handleDeployment}
      disabled={isDeploying}
      variant="default"
    >
      {isDeploying ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Deploying...
        </>
      ) : (
        <>
          <Plus className="mr-2 h-4 w-4" />
          Deploy New Products
        </>
      )}
    </Button>
  );
};