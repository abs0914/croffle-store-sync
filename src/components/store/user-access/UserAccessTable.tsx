
import { useState, useEffect } from "react";
import { User, UserRole } from "@/types";
import { X, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

interface StoreUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  hasAccess: boolean;
}

interface UserAccessTableProps {
  users: StoreUser[];
  filteredUsers: StoreUser[];
  onToggleAccess: (userId: string, hasAccess: boolean) => void;
}

export default function UserAccessTable({ users, filteredUsers, onToggleAccess }: UserAccessTableProps) {
  const { user: currentUser } = useAuth();

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Has Access</TableHead>
          <TableHead className="w-[100px]">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filteredUsers.map((user) => {
          // Don't show the current user in the list
          if (user.id === currentUser?.id) return null;
          
          // Don't allow modifying admin access as they have global access
          const isAdmin = user.role === 'admin';
          
          return (
            <TableRow key={user.id}>
              <TableCell>{user.name}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                <span className="capitalize">{user.role}</span>
              </TableCell>
              <TableCell>
                {isAdmin ? (
                  <span className="text-green-600 flex items-center">
                    <Check className="h-4 w-4 mr-1" />
                    Global Access
                  </span>
                ) : user.hasAccess ? (
                  <span className="text-green-600 flex items-center">
                    <Check className="h-4 w-4 mr-1" />
                    Yes
                  </span>
                ) : (
                  <span className="text-red-600 flex items-center">
                    <X className="h-4 w-4 mr-1" />
                    No
                  </span>
                )}
              </TableCell>
              <TableCell>
                {!isAdmin && (
                  <Button
                    size="sm"
                    variant={user.hasAccess ? "destructive" : "default"}
                    onClick={() => onToggleAccess(user.id, user.hasAccess)}
                  >
                    {user.hasAccess ? "Remove" : "Grant"}
                  </Button>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
