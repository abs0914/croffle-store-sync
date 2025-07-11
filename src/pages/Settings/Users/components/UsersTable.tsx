
import { useState, useMemo } from "react";
import { AppUser } from "@/types/appUser";
import { Store } from "@/types/store";
import EnhancedUsersTable from "./EnhancedUsersTable";

interface UsersTableProps {
  users: AppUser[];
  isLoading: boolean;
  onAdd: () => void;
  onEdit: (user: AppUser) => void;
  onDelete: (user: AppUser) => void;
  onActivate?: (user: AppUser) => void;
  onDeactivate?: (user: AppUser) => void;
  allStores: Store[];
}

export default function UsersTable(props: UsersTableProps) {
  return <EnhancedUsersTable {...props} />;
}
