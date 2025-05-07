
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useStore } from "@/contexts/StoreContext";

export function StoreInfo() {
  const { currentStore } = useStore();

  return (
    <Card className="border-croffle-primary/20">
      <CardHeader>
        <CardTitle className="text-croffle-primary">Store Information</CardTitle>
        <CardDescription>Current store details</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {currentStore ? (
          <>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Store Name</p>
              <p className="font-medium">{currentStore.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Address</p>
              <p className="font-medium">{currentStore.address}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Contact</p>
              <p className="font-medium">{currentStore.phone}</p>
              <p className="font-medium text-sm">{currentStore.email}</p>
            </div>
            {currentStore.tax_id && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tax ID</p>
                <p className="font-medium">{currentStore.tax_id}</p>
              </div>
            )}
          </>
        ) : (
          <p>No store selected</p>
        )}
      </CardContent>
    </Card>
  );
}
