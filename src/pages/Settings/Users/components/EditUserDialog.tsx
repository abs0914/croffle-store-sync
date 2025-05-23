
import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateAppUser, setUserPassword } from "@/services/appUser";
import { AppUser, AppUserFormData } from "@/types/appUser";
import { Store } from "@/types/store";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/contexts/auth";
import { toast } from "sonner";
import UserFormFields from "./UserFormFields";
import AuthFormFields from "@/components/shared/AuthFormFields";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle, Key } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface EditUserDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  user: AppUser | null;
  stores: Store[];
}

export default function EditUserDialog({ isOpen, onOpenChange, user, stores }: EditUserDialogProps) {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const isAdmin = hasPermission('admin');
  
  const [activeTab, setActiveTab] = useState<string>("general");
  const [formData, setFormData] = useState<AppUserFormData>({
    firstName: "",
    lastName: "",
    contactNumber: "",
    email: "",
    role: user?.role || "cashier",
    storeIds: [],
    isActive: true
  });

  const [passwordData, setPasswordData] = useState({
    email: "",
    password: ""
  });

  const [isSettingPassword, setIsSettingPassword] = useState(false);

  const updateMutation = useMutation({
    mutationFn: updateAppUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app_users"] });
      onOpenChange(false);
      toast.success("User updated successfully");
    }
  });

  const setPasswordMutation = useMutation({
    mutationFn: ({ email, password }: { email: string, password: string }) => 
      setUserPassword(email, password),
    onSuccess: () => {
      setIsSettingPassword(false);
      setPasswordData({ email: user?.email || "", password: "" });
      toast.success("Password set successfully");
    },
    onError: (error: any) => {
      setIsSettingPassword(false);
      toast.error(`Failed to set password: ${error.message}`);
    }
  });

  useEffect(() => {
    if (user) {
      setFormData({
        id: user.id,
        userId: user.userId || undefined,
        firstName: user.firstName,
        lastName: user.lastName,
        contactNumber: user.contactNumber || "",
        email: user.email || "",
        role: user.role,
        storeIds: user.storeIds,
        isActive: user.isActive
      });
      
      setPasswordData({
        email: user.email || "",
        password: ""
      });
    }
  }, [user]);

  const handleChange = (field: keyof AppUserFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!passwordData.email || !passwordData.password) {
      toast.error("Email and password are required");
      return;
    }
    
    if (passwordData.password.length < 8) {
      toast.error("Password must be at least 8 characters long");
      return;
    }
    
    setIsSettingPassword(true);
    setPasswordMutation.mutate({
      email: passwordData.email,
      password: passwordData.password
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (user) {
      updateMutation.mutate({
        ...formData,
        id: user.id
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Update user information and permissions.
          </DialogDescription>
        </DialogHeader>
        
        {isAdmin && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="general">User Details</TabsTrigger>
              <TabsTrigger value="password">Password Management</TabsTrigger>
            </TabsList>
            
            <TabsContent value="general" className="mt-4">
              <form id="user-form" onSubmit={handleSubmit}>
                <UserFormFields
                  formData={formData}
                  onChange={handleChange}
                  stores={stores}
                />
              </form>
            </TabsContent>
            
            <TabsContent value="password" className="mt-4">
              <div className="space-y-4">
                <div className="border-t pt-4 mt-4">
                  <h4 className="text-sm font-medium flex items-center gap-1 mb-2">
                    <Key className="h-4 w-4" />
                    Set New Password
                  </h4>
                  <p className="text-xs text-muted-foreground mb-4">
                    Directly set a new password for this user
                  </p>
                  
                  <form onSubmit={handleSetPassword} className="space-y-4">
                    <AuthFormFields
                      email={passwordData.email}
                      password={passwordData.password}
                      onInputChange={handlePasswordChange}
                      isEditMode={true}
                    />
                    
                    <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md p-3">
                      <div className="flex gap-2 text-amber-800 dark:text-amber-300">
                        <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                        <p className="text-xs">
                          Use this option with caution. This will immediately change the user's password
                          without requiring any verification.
                        </p>
                      </div>
                    </div>
                    
                    <Button 
                      type="submit" 
                      variant="secondary"
                      disabled={isSettingPassword || !passwordData.password}
                      className="w-full"
                    >
                      {isSettingPassword ? (
                        <>
                          <Spinner className="mr-2 h-4 w-4" />
                          Setting Password...
                        </>
                      ) : (
                        "Set New Password"
                      )}
                    </Button>
                  </form>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}
        
        <DialogFooter className="pt-4 mt-4">
          <Button 
            variant="outline" 
            type="button" 
            onClick={() => onOpenChange(false)}
            disabled={updateMutation.isPending}
          >
            Cancel
          </Button>
          {activeTab === "general" && (
            <Button 
              form="user-form"
              type="submit" 
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? <Spinner className="mr-2 h-4 w-4" /> : null}
              Save Changes
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
