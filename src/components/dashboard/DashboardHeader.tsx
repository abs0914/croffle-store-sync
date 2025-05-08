
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useStore } from "@/contexts/StoreContext";
import { StoreNameDisplay } from "@/components/shared/StoreNameDisplay";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function DashboardHeader() {
  const { stores, currentStore, setCurrentStore, isLoading } = useStore();

  const handleStoreChange = (storeId: string) => {
    const selectedStore = stores.find((store) => store.id === storeId);
    if (selectedStore) {
      setCurrentStore(selectedStore);
    }
  };

  return (
    <div className="flex justify-between items-center">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold text-croffle-primary">Dashboard</h1>
        {!isLoading && stores.length > 0 && (
          <Select
            value={currentStore?.id}
            onValueChange={handleStoreChange}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select store" />
            </SelectTrigger>
            <SelectContent>
              {stores.map((store) => (
                <SelectItem key={store.id} value={store.id}>
                  <div className="flex items-center gap-2">
                    {store.logo_url && (
                      <img 
                        src={store.logo_url} 
                        className="h-4 w-4 object-cover"
                        alt={store.name}
                      />
                    )}
                    {store.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      <Button asChild className="bg-croffle-accent hover:bg-croffle-accent/90">
        <Link to="/pos">Start POS Shift</Link>
      </Button>
    </div>
  );
}
