
import { useState } from "react";
import { AppUser } from "@/types/appUser";

export default function useUserDialogs() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isActivateDialogOpen, setIsActivateDialogOpen] = useState(false);
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);
  
  const handleAddUser = () => {
    setIsAddDialogOpen(true);
  };

  const handleEditUser = (user: AppUser) => {
    setSelectedUser(user);
    setIsEditDialogOpen(true);
  };

  const handleDeleteUser = (user: AppUser) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };
  
  const handleActivateUser = (user: AppUser) => {
    setSelectedUser(user);
    setIsDeactivating(false);
    setIsActivateDialogOpen(true);
  };
  
  const handleDeactivateUser = (user: AppUser) => {
    setSelectedUser(user);
    setIsDeactivating(true);
    setIsActivateDialogOpen(true);
  };

  const handleResetPassword = (user: AppUser) => {
    setSelectedUser(user);
    setIsResetPasswordDialogOpen(true);
  };

  return {
    isAddDialogOpen,
    setIsAddDialogOpen,
    isEditDialogOpen,
    setIsEditDialogOpen,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    isActivateDialogOpen,
    setIsActivateDialogOpen,
    isResetPasswordDialogOpen,
    setIsResetPasswordDialogOpen,
    selectedUser,
    isDeactivating,
    handlers: {
      handleAddUser,
      handleEditUser,
      handleDeleteUser,
      handleActivateUser,
      handleDeactivateUser,
      handleResetPassword
    }
  };
}
