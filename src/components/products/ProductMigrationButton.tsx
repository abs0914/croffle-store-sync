import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Database, Loader2 } from "lucide-react";
import { runProductMigration } from "@/scripts/runProductMigration";
import { toast } from "sonner";
interface ProductMigrationButtonProps {
  onMigrationComplete?: () => void;
}
export const ProductMigrationButton: React.FC<ProductMigrationButtonProps> = ({
  onMigrationComplete
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const handleMigration = async () => {
    if (isRunning) return;
    setIsRunning(true);
    try {
      const result = await runProductMigration();
      if (result.success && onMigrationComplete) {
        // Refresh the page data
        onMigrationComplete();
      }
    } catch (error) {
      console.error("Migration error:", error);
      toast.error("Migration failed with unexpected error");
    } finally {
      setIsRunning(false);
    }
  };
  return (
    <Button 
      onClick={handleMigration}
      disabled={isRunning}
      variant="outline"
    >
      {isRunning ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Running Migration...
        </>
      ) : (
        <>
          <Database className="mr-2 h-4 w-4" />
          Run Migration
        </>
      )}
    </Button>
  );
};