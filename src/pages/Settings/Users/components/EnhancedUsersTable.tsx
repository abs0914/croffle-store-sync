import { useState, useMemo } from "react";
import { AppUser } from "@/types/appUser";
import { Store } from "@/types/store";
import { UserTableFilters, UserFilters } from "./table";
import EnhancedUserTable from "./table/EnhancedUserTable";
import BulkUserActions from "./BulkUserActions";
import { Checkbox } from "@/components/ui/checkbox";

interface EnhancedUsersTableProps {
  users: AppUser[];
  isLoading: boolean;
  onAdd: () => void;
  onEdit: (user: AppUser) => void;
  onDelete: (user: AppUser) => void;
  onActivate?: (user: AppUser) => void;
  onDeactivate?: (user: AppUser) => void;
  onResetPassword?: (user: AppUser) => void;
  onBulkActivate?: (userIds: string[]) => void;
  onBulkDeactivate?: (userIds: string[]) => void;
  onBulkRoleChange?: (userIds: string[], newRole: string) => void;
  onBulkDelete?: (userIds: string[]) => void;
  allStores: Store[];
}

export default function EnhancedUsersTable({ 
  users, 
  isLoading, 
  onAdd, 
  onEdit, 
  onDelete,
  onActivate,
  onDeactivate,
  onResetPassword,
  onBulkActivate,
  onBulkDeactivate,
  onBulkRoleChange,
  onBulkDelete,
  allStores 
}: EnhancedUsersTableProps) {
  const [filters, setFilters] = useState<UserFilters>({
    name: '',
    role: 'all',
    store: 'all',
    status: 'all'
  });
  
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

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
        `${user.firstName} ${user.lastName}`.toLowerCase().includes(filters.name.toLowerCase()) ||
        user.email?.toLowerCase().includes(filters.name.toLowerCase());
      
      const roleMatch = filters.role === 'all' || user.role === filters.role;
      
      const storeMatch = 
        filters.store === 'all' || 
        (filters.store === 'none' && (!user.storeIds || user.storeIds.length === 0)) ||
        user.storeIds?.some(id => id === filters.store);
      
      const statusMatch = 
        filters.status === 'all' || 
        (filters.status === 'active' && user.isActive) || 
        (filters.status === 'inactive' && !user.isActive);
      
      return nameMatch && roleMatch && storeMatch && statusMatch;
    });
  }, [users, filters]);

  // Handle individual user selection
  const handleUserSelection = (userId: string, selected: boolean) => {
    setSelectedUserIds(prev => 
      selected 
        ? [...prev, userId]
        : prev.filter(id => id !== userId)
    );
  };

  // Update filtered user selections when users change
  const filteredSelectedIds = selectedUserIds.filter(id => 
    filteredUsers.some(user => user.id === id)
  );

  const handleBulkActivateWrapper = (userIds: string[]) => {
    if (onBulkActivate) {
      onBulkActivate(userIds);
    } else if (onActivate) {
      // Fallback to individual activation
      userIds.forEach(id => {
        const user = users.find(u => u.id === id);
        if (user) onActivate(user);
      });
    }
    setSelectedUserIds([]);
  };

  const handleBulkDeactivateWrapper = (userIds: string[]) => {
    if (onBulkDeactivate) {
      onBulkDeactivate(userIds);
    } else if (onDeactivate) {
      // Fallback to individual deactivation  
      userIds.forEach(id => {
        const user = users.find(u => u.id === id);
        if (user) onDeactivate(user);
      });
    }
    setSelectedUserIds([]);
  };

  const handleBulkRoleChangeWrapper = (userIds: string[], newRole: string) => {
    if (onBulkRoleChange) {
      onBulkRoleChange(userIds, newRole);
    }
    setSelectedUserIds([]);
  };

  const handleBulkDeleteWrapper = (userIds: string[]) => {
    if (onBulkDelete) {
      onBulkDelete(userIds);
    }
    setSelectedUserIds([]);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <UserTableFilters 
        filters={filters} 
        onFilterChange={handleFilterChange} 
        allStores={allStores} 
      />

      {/* Bulk Actions */}
      <BulkUserActions
        users={filteredUsers}
        selectedUserIds={filteredSelectedIds}
        onSelectionChange={setSelectedUserIds}
        onBulkActivate={handleBulkActivateWrapper}
        onBulkDeactivate={handleBulkDeactivateWrapper}
        onBulkRoleChange={handleBulkRoleChangeWrapper}
        onBulkDelete={handleBulkDeleteWrapper}
      />
      
      {/* Enhanced Users Table with selection */}
      <div className="space-y-2">
        <EnhancedUserTableWithSelection
          users={filteredUsers}
          allStores={allStores}
          selectedUserIds={filteredSelectedIds}
          onUserSelection={handleUserSelection}
          onEdit={onEdit}
          onDelete={onDelete}
          onActivate={onActivate}
          onDeactivate={onDeactivate}
          onResetPassword={onResetPassword}
        />
      </div>
    </div>
  );
}

// Sub-component to handle user selection in the table
interface EnhancedUserTableWithSelectionProps {
  users: AppUser[];
  allStores: Store[];
  selectedUserIds: string[];
  onUserSelection: (userId: string, selected: boolean) => void;
  onEdit: (user: AppUser) => void;
  onDelete: (user: AppUser) => void;
  onActivate?: (user: AppUser) => void;
  onDeactivate?: (user: AppUser) => void;
  onResetPassword?: (user: AppUser) => void;
}

function EnhancedUserTableWithSelection({
  users,
  allStores,
  selectedUserIds,
  onUserSelection,
  onEdit,
  onDelete,
  onActivate,
  onDeactivate,
  onResetPassword
}: EnhancedUserTableWithSelectionProps) {
  return (
    <EnhancedUserTable
      users={users}
      allStores={allStores}
      onEdit={onEdit}
      onDelete={onDelete}
      onActivate={onActivate}
      onDeactivate={onDeactivate}
      onResetPassword={onResetPassword}
    />
  );
}