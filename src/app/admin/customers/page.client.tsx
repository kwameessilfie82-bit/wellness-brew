"use client";

import type { ColumnDef, ColumnMeta, Column } from "@tanstack/react-table";
import type React from "react";

import { Hash, Mail, User as UserIcon, Calendar, Shield, CheckCircle, XCircle, Search, Trash2, Users, UserCog, UserCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useCallback } from "react";

import { ADMIN_CONFIG } from "@/app";
import { defineMeta, filterFn } from "@/lib/filters";

import { Button } from "@/ui/primitives/button";
import { DataTable } from "@/ui/primitives/data-table/data-table";
import { DataTableColumnHeader } from "@/ui/primitives/data-table/data-table-column-header";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/primitives/select";
import { Input } from "@/ui/primitives/input";
import { Card, CardContent } from "@/ui/primitives/card";

import type { UserWithRole } from "./page.types";
import type { AdminUserWithDetails } from "@/db/schema";

interface CustomersPageClientProps {
  initialData: UserWithRole[];
  adminUser: AdminUserWithDetails | null;
  authSyncEnabled: boolean;
}

const CustomersPageClient: React.FC<CustomersPageClientProps> = ({
  initialData,
  adminUser,
  authSyncEnabled,
}) => {
  const router = useRouter();
  const [users, setUsers] = useState<UserWithRole[]>(initialData);
  const [searchQuery, setSearchQuery] = useState("");

  // Calculate user statistics
  const userStats = useMemo(() => {
    const managers = users.filter(user => user.adminRole?.name === 'manager').length;
    const admins = users.filter(user => user.adminRole?.name === 'admin').length;
    const customers = users.filter(user => !user.adminRole).length;
    
    return { managers, admins, customers, total: users.length };
  }, [users]);

  // Filter users based on search query
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    
    const query = searchQuery.toLowerCase();
    return users.filter(user => 
      user.name.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      user.id.toLowerCase().includes(query)
    );
  }, [users, searchQuery]);

  // Handle role change
  const handleRoleChange = useCallback(async (userId: string, newRole: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (response.ok) {
        // Update local state
        setUsers(prev => prev.map(user => 
          user.id === userId 
            ? { ...user, adminRole: newRole === 'none' ? null : { name: newRole, description: '' } }
            : user
        ));
      } else {
        const error = await response.json();
        console.error('Failed to update user role:', error);
        alert('Failed to update user role: ' + (error.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error updating user role:', error);
      alert('Error updating user role. Please try again.');
    }
  }, []);

  // Handle delete user
  const handleDeleteUser = useCallback(async (userId: string) => {
    // Only managers can delete and they cannot delete themselves
    const isManager = adminUser?.role?.name === 'manager';
    const isSelf = adminUser?.userId === userId;
    if (!isManager || isSelf) {
      alert(isSelf ? 'You cannot delete your own account' : 'Only managers can delete users');
      return;
    }

    if (confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      try {
        const response = await fetch(`/api/admin/users/${userId}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          setUsers((prev) => prev.filter((user) => user.id !== userId));
          router.refresh();
        } else {
          const error = await response.json();
          console.error('Failed to delete user:', error);
          alert('Failed to delete user: ' + (error.error || 'Unknown error'));
        }
      } catch (error) {
        console.error('Error deleting user:', error);
        alert('Error deleting user. Please try again.');
      }
    }
  }, [adminUser, router]);

  const columns = useMemo(
    (): ColumnDef<UserWithRole>[] => [
      {
        accessorKey: "id",
        filterFn: filterFn("text"),
        header: ({ column }: { column: Column<UserWithRole, unknown> }) => (
          <DataTableColumnHeader column={column} title="User ID" />
        ),
        meta: defineMeta((row: UserWithRole) => row.id, {
          displayName: "User ID",
          icon: Hash,
          type: "text",
        }) as ColumnMeta<UserWithRole, unknown>,
      },
      {
        accessorKey: "name",
        filterFn: filterFn("text"),
        header: ({ column }: { column: Column<UserWithRole, unknown> }) => (
          <DataTableColumnHeader column={column} title="Name" />
        ),
        meta: defineMeta((row: UserWithRole) => row.name, {
          displayName: "Name",
          icon: UserIcon,
          type: "text",
        }) as ColumnMeta<UserWithRole, unknown>,
      },
      ...(ADMIN_CONFIG.displayEmails
        ? [
            {
              accessorKey: "email",
              filterFn: filterFn("text"),
              header: ({ column }: { column: Column<UserWithRole, unknown> }) => (
                <DataTableColumnHeader column={column} title="Email" />
              ),
              meta: defineMeta((row: UserWithRole) => row.email, {
                displayName: "Email",
                icon: Mail,
                type: "text",
              }) as ColumnMeta<UserWithRole, unknown>,
            },
          ]
        : []),
      {
        accessorKey: "emailVerified",
        header: ({ column }: { column: Column<UserWithRole, unknown> }) => (
          <DataTableColumnHeader column={column} title="Email Verified" />
        ),
        cell: ({ row }) => {
          const isVerified = row.getValue("emailVerified") as boolean;
          return (
            <div className="flex items-center">
              {isVerified ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
              <span className="ml-2 text-sm">
                {isVerified ? "Verified" : "Unverified"}
              </span>
            </div>
          );
        },
        meta: defineMeta((row: UserWithRole) => row.emailVerified, {
          displayName: "Email Verified",
          icon: CheckCircle,
          type: "option",
        }) as ColumnMeta<UserWithRole, unknown>,
      },
      {
        accessorKey: "createdAt",
        header: ({ column }: { column: Column<UserWithRole, unknown> }) => (
          <DataTableColumnHeader column={column} title="Joined" />
        ),
        cell: ({ row }) => {
          const date = row.getValue("createdAt") as Date;
          return (
            <div className="flex items-center">
              <Calendar className="h-4 w-4 text-muted-foreground mr-2" />
              <span className="text-sm">
                {new Date(date).toLocaleDateString()}
              </span>
            </div>
          );
        },
        meta: defineMeta((row: UserWithRole) => row.createdAt, {
          displayName: "Joined Date",
          icon: Calendar,
          type: "date",
        }) as ColumnMeta<UserWithRole, unknown>,
      },
      {
        accessorKey: "adminRole",
        header: ({ column }: { column: Column<UserWithRole, unknown> }) => (
          <DataTableColumnHeader column={column} title="Role" />
        ),
        cell: ({ row }) => {
          const user = row.original;
          const currentRole = user.adminRole?.name || 'none';
          
          return (
            <div className="flex items-center space-x-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <Select
                value={currentRole}
                onValueChange={(value) => handleRoleChange(user.id, value)}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Customer</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>
          );
        },
        meta: defineMeta((row: UserWithRole) => row.adminRole?.name || 'none', {
          displayName: "Role",
          icon: Shield,
          type: "text",
        }) as ColumnMeta<UserWithRole, unknown>,
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const user = row.original;
          const isViewerManager = adminUser?.role?.name === 'manager';
          const isSelf = adminUser?.userId === user.id;
          const canDelete = !!isViewerManager && !isSelf;
          
          return (
            <div className="flex items-center space-x-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => canDelete && handleDeleteUser(user.id)}
                disabled={!canDelete}
                title={!canDelete ? (isSelf ? 'You cannot delete your own account' : 'Only managers can delete users') : 'Delete user'}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          );
        },
      },
    ],
    [handleDeleteUser, handleRoleChange, adminUser?.role?.name, adminUser?.userId],
  );

  return (
    <div className="space-y-6">
      {!authSyncEnabled ? (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
          Add <code className="text-xs">SUPABASE_SERVICE_ROLE_KEY</code> to your{" "}
          <code className="text-xs">.env</code> so this list stays in sync with Supabase
          Authentication. Without it, deleting users in Auth or here can get out of step.
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Synced with Supabase Authentication — same accounts customers use to sign in.
        </p>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Users</h1>
        <div className="text-sm text-muted-foreground">
          {filteredUsers.length} of {userStats.total} users
        </div>
      </div>

      {/* User Statistics - Mobile Optimized */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        <Card className="group hover:shadow-lg transition-all duration-300 border-border/50 hover:border-primary/30 bg-gradient-to-br from-background to-background/80">
          <CardContent className="p-4">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="text-2xl sm:text-3xl font-bold text-primary group-hover:scale-110 transition-transform duration-300">
                {userStats.total}
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <div className="text-xs sm:text-sm font-medium text-muted-foreground">Total Users</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="group hover:shadow-lg transition-all duration-300 border-border/50 hover:border-blue-300 bg-gradient-to-br from-background to-blue-50/20">
          <CardContent className="p-4">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="text-2xl sm:text-3xl font-bold text-blue-600 group-hover:scale-110 transition-transform duration-300">
                {userStats.managers}
              </div>
              <div className="flex items-center gap-2">
                <UserCog className="h-4 w-4 text-blue-500" />
                <div className="text-xs sm:text-sm font-medium text-muted-foreground">Managers</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="group hover:shadow-lg transition-all duration-300 border-border/50 hover:border-green-300 bg-gradient-to-br from-background to-green-50/20">
          <CardContent className="p-4">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="text-2xl sm:text-3xl font-bold text-green-600 group-hover:scale-110 transition-transform duration-300">
                {userStats.admins}
              </div>
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-green-500" />
                <div className="text-xs sm:text-sm font-medium text-muted-foreground">Admins</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="group hover:shadow-lg transition-all duration-300 border-border/50 hover:border-orange-300 bg-gradient-to-br from-background to-orange-50/20">
          <CardContent className="p-4">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="text-2xl sm:text-3xl font-bold text-orange-600 group-hover:scale-110 transition-transform duration-300">
                {userStats.customers}
              </div>
              <div className="flex items-center gap-2">
                <UserIcon className="h-4 w-4 text-orange-500" />
                <div className="text-xs sm:text-sm font-medium text-muted-foreground">Customers</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Users Table */}
      <DataTable
        columns={columns}
        data={filteredUsers}
        initialColumnVisibility={{ id: false }}
      />
    </div>
  );
};

export default CustomersPageClient;
