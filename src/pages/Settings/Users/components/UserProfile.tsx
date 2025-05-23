
import { useState } from "react";
import { useAuth } from "@/contexts/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ChangePasswordForm from "./ChangePasswordForm";

export default function UserProfile() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");
  
  if (!user) {
    return <div>Loading user profile...</div>;
  }
  
  const initials = user.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase();

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
      case "owner": return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
      case "manager": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
      default: return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>My Profile</CardTitle>
        <CardDescription>View and manage your account information</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row gap-6 items-start">
          <div className="flex flex-col items-center gap-3">
            <Avatar className="h-24 w-24">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback className="text-xl">{initials}</AvatarFallback>
            </Avatar>
            <Badge className={`${getRoleBadgeColor(user.role)} uppercase`}>
              {user.role}
            </Badge>
          </div>
          
          <div className="flex-1">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="profile">Profile Info</TabsTrigger>
                <TabsTrigger value="security">Security</TabsTrigger>
              </TabsList>
              
              <TabsContent value="profile" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Full Name</h3>
                    <p className="text-base">{user.name}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Email</h3>
                    <p className="text-base">{user.email}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Role</h3>
                    <p className="capitalize text-base">{user.role}</p>
                  </div>
                  {user.storeIds && user.storeIds.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">Store Access</h3>
                      <p className="text-base">{user.storeIds.length} {user.storeIds.length === 1 ? 'store' : 'stores'}</p>
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="security">
                <ChangePasswordForm />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
