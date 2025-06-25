
import { Store } from "@/types";
import { Building2 } from "lucide-react";

interface StoreSettingsHeaderProps {
  store: Store | null;
}

export const StoreSettingsHeader = ({ store }: StoreSettingsHeaderProps) => {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-3">
        <Building2 className="h-8 w-8 text-croffle-accent" />
        <div>
          <h1 className="text-3xl font-bold">Store Settings</h1>
          <p className="text-muted-foreground">
            {store ? `Configure settings for ${store.name}` : 'Configure store settings'}
          </p>
        </div>
      </div>
    </div>
  );
};
