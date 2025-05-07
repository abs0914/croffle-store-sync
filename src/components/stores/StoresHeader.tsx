
import { useAuth } from "@/contexts/AuthContext";
import CreateStoreDialog from "./CreateStoreDialog";

export default function StoresHeader() {
  const { hasPermission } = useAuth();
  
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-3xl font-bold text-croffle-primary">Stores</h1>
        <p className="text-muted-foreground">Manage your store locations</p>
      </div>
      
      {hasPermission('owner') && <CreateStoreDialog />}
    </div>
  );
}
