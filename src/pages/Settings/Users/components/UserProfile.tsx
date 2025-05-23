
import { AppUser } from "@/types/appUser";
import { Store } from "@/types/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface UserProfileProps {
  user: AppUser;
  stores: Store[];
}

export default function UserProfile({ user, stores }: UserProfileProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xl font-bold">Your Profile</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Name</p>
              <p>{user.firstName} {user.lastName}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Email</p>
              <p>{user.email || "Not provided"}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Contact</p>
              <p>{user.contactNumber || "Not provided"}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Role</p>
              <p className="capitalize">{user.role}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <p className={user.isActive ? "text-green-600" : "text-red-600"}>
                {user.isActive ? "Active" : "Inactive"}
              </p>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">Assigned Stores</p>
            <div className="flex flex-wrap gap-2">
              {user.storeIds.map(storeId => {
                const store = stores.find(s => s.id === storeId);
                return (
                  <span key={storeId} className="px-2 py-1 bg-muted rounded-md text-sm">
                    {store?.name || "Unknown Store"}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
