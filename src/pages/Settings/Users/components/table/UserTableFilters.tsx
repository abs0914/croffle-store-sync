
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Store } from "@/types/store";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface UserFilters {
  name: string;
  role: string;
  store: string;
  status: string;
}

interface UserTableFiltersProps {
  filters: UserFilters;
  onFilterChange: (field: keyof UserFilters, value: string) => void;
  allStores: Store[];
}

export default function UserTableFilters({
  filters,
  onFilterChange,
  allStores
}: UserTableFiltersProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Input
        placeholder="Filter by name"
        value={filters.name}
        onChange={(e) => onFilterChange('name', e.target.value)}
        className="max-w-sm"
      />
      <Select value={filters.role} onValueChange={(value) => onFilterChange('role', value)}>
        <SelectTrigger>
          <SelectValue placeholder="Filter by role" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All roles</SelectItem>
          <SelectItem value="admin">Admin</SelectItem>
          <SelectItem value="owner">Owner</SelectItem>
          <SelectItem value="manager">Manager</SelectItem>
          <SelectItem value="cashier">Cashier</SelectItem>
        </SelectContent>
      </Select>
      <Select value={filters.store} onValueChange={(value) => onFilterChange('store', value)}>
        <SelectTrigger>
          <SelectValue placeholder="Filter by store" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All stores</SelectItem>
          <SelectItem value="none">No store</SelectItem>
          {allStores.map(store => (
            <SelectItem key={store.id} value={store.id}>{store.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={filters.status} onValueChange={(value) => onFilterChange('status', value)}>
        <SelectTrigger>
          <SelectValue placeholder="Filter by status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All status</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="inactive">Inactive</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
