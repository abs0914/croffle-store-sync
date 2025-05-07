
import { Link } from "react-router-dom";
import { Store } from "@/types";
import { Settings, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface StoreListItemProps {
  store: Store;
}

export default function StoreListItem({ store }: StoreListItemProps) {
  const { hasPermission } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  
  const handleDeleteStore = async () => {
    try {
      setIsDeleting(true);
      const { error } = await supabase
        .from('stores')
        .delete()
        .eq('id', store.id);

      if (error) throw error;
      
      toast.success("Store deleted successfully");
    } catch (error: any) {
      console.error("Error deleting store:", error);
      toast.error(error.message || "Failed to delete store");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <TableRow key={store.id}>
      <TableCell className="font-medium">{store.name}</TableCell>
      <TableCell>{store.address}</TableCell>
      <TableCell>
        <div>{store.phone}</div>
        <div className="text-muted-foreground text-sm">{store.email}</div>
      </TableCell>
      <TableCell>
        {store.isActive ? (
          <Badge variant="default" className="bg-green-500 hover:bg-green-600">Active</Badge>
        ) : (
          <Badge variant="outline">Inactive</Badge>
        )}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="icon"
            asChild
          >
            <Link to={`/stores/${store.id}`}>
              <Settings className="h-4 w-4" />
              <span className="sr-only">Settings</span>
            </Link>
          </Button>
          
          {hasPermission('owner') && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="icon" className="text-red-500 hover:text-red-600">
                  <Trash className="h-4 w-4" />
                  <span className="sr-only">Delete</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the store
                    and all associated data.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteStore}
                    className="bg-red-500 hover:bg-red-600"
                    disabled={isDeleting}
                  >
                    {isDeleting ? "Deleting..." : "Delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
