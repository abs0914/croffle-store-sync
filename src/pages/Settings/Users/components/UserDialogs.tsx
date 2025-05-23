
import { useState } from "react";
import { AppUser } from "@/types/appUser";
import { Store } from "@/types/store";
import AddUserDialog from "./AddUserDialog";
import EditUserDialog from "./EditUserDialog";
import DeleteUserDialog from "./DeleteUserDialog";
import ActivateUserDialog from "./ActivateUserDialog";

interface UserDialogsProps {
  isAddDialogOpen: boolean;
  isEditDialogOpen: boolean;
  isDeleteDialogOpen: boolean;
  isActivateDialogOpen: boolean;
  selectedUser: AppUser | null;
  isDeactivating: boolean;
  stores: Store[];
  setIsAddDialogOpen: (isOpen: boolean) => void;
  setIsEditDialogOpen: (isOpen: boolean) => void;
  setIsDeleteDialogOpen: (isOpen: boolean) => void;
  setIsActivateDialogOpen: (isOpen: boolean) => void;
}

export default function UserDialogs({
  isAddDialogOpen,
  isEditDialogOpen,
  isDeleteDialogOpen,
  isActivateDialogOpen,
  selectedUser,
  isDeactivating,
  stores,
  setIsAddDialogOpen,
  setIsEditDialogOpen,
  setIsDeleteDialogOpen,
  setIsActivateDialogOpen
}: UserDialogsProps) {
  return (
    <>
      <AddUserDialog 
        isOpen={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        stores={stores}
      />

      <EditUserDialog 
        isOpen={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        user={selectedUser}
        stores={stores}
      />

      <DeleteUserDialog 
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        user={selectedUser}
      />
      
      <ActivateUserDialog
        isOpen={isActivateDialogOpen}
        onOpenChange={setIsActivateDialogOpen}
        user={selectedUser}
        isDeactivating={isDeactivating}
      />
    </>
  );
}
