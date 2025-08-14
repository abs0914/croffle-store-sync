import { Button } from "@/components/ui/button";
import { fixJanaUser } from "@/utils/fixJanaUser";
import { toast } from "sonner";

export function FixJanaUserButton() {
  const handleFix = async () => {
    try {
      toast.info("Fixing Jana user...");
      const result = await fixJanaUser();
      
      if (result) {
        toast.success("Jana user successfully updated with correct role and store assignment!");
      } else {
        toast.error("Failed to fix Jana user");
      }
    } catch (error) {
      console.error("Error fixing user:", error);
      toast.error("Error occurred while fixing user");
    }
  };

  return (
    <Button 
      onClick={handleFix}
      variant="outline"
      className="mb-4"
    >
      Fix Jana User Data
    </Button>
  );
}