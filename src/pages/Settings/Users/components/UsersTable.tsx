
import { useState, useMemo } from "react";
import { AppUser } from "@/types/appUser";
import { Store } from "@/types/store";
import { UserTable, UserTableFilters, UserFilters } from "./table";

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

export default function UsersTable({ 
  users, 
  isLoading, 
  onAdd, 
  onEdit, 
  onDelete,
  onActivate,
  onDeactivate,
  allStores 
}: UsersTableProps) {
  const [filters, setFilters] = useState<UserFilters>({
    name: '',
    role: '',
    store: '',
    status: ''
  });

  const handleFilterChange = (field: keyof UserFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Filter users based on the filter criteria
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const nameMatch = !filters.name || 
        `${user.firstName} ${user.lastName}`.toLowerCase().includes(filters.name.toLowerCase());
      
      const roleMatch = !filters.role || user.role === filters.role;
      
      const storeMatch = !filters.store || 
        (filters.store === 'none' && (!user.storeIds || user.storeIds.length === 0)) ||
        user.storeIds?.some(id => id === filters.store);
      
      const statusMatch = !filters.status || 
        (filters.status === 'active' && user.isActive) || 
        (filters.status === 'inactive' && !user.isActive);
      
      return nameMatch && roleMatch && storeMatch && statusMatch;
    });
  }, [users, filters]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <UserTableFilters 
        filters={filters} 
        onFilterChange={handleFilterChange} 
        allStores={allStores} 
      />
      
      {/* Users Table */}
      <UserTable
        users={filteredUsers}
        allStores={allStores}
        onEdit={onEdit}
        onDelete={onDelete}
        onActivate={onActivate}
        onDeactivate={onDeactivate}
      />
    </div>
  );
}
