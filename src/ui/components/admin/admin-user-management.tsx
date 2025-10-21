"use client";

import { useEffect, useState } from "react";
import { Edit, Trash2, Search, UserPlus, Shield, UserX } from "lucide-react";

import { Button } from "@/ui/primitives/button";
import { Input } from "@/ui/primitives/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/primitives/card";
import { Badge, badgeVariants } from "@/ui/primitives/badge";
import type { VariantProps } from "class-variance-authority";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui/primitives/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/ui/primitives/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/ui/primitives/select";
import { Label } from "@/ui/primitives/label";
import { Switch } from "@/ui/primitives/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/ui/primitives/avatar";
import type { AdminUserWithDetails, AdminRole } from "@/db/schema";

interface AdminUserManagementProps {
  adminUser: AdminUserWithDetails;
}

async function fetchAdminUsers(): Promise<AdminUserWithDetails[]> {
  const res = await fetch("/api/admin/users", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch admin users");
  return res.json();
}
async function fetchAdminRoles(): Promise<AdminRole[]> {
  const res = await fetch("/api/admin/roles", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch roles");
  return res.json();
}

// (mock admin users removed; using live data)

export function AdminUserManagement({ adminUser }: AdminUserManagementProps) {
  const [adminUsers, setAdminUsers] = useState<AdminUserWithDetails[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminUserWithDetails | null>(null);
  const [newAdmin, setNewAdmin] = useState({
    email: "",
    roleId: "",
  });
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const [usersRes, rolesRes] = await Promise.all([
          fetchAdminUsers(),
          fetchAdminRoles(),
        ]);
        if (!mounted) return;
        setAdminUsers(usersRes);
        setRoles(rolesRes);
      } catch {
        if (!mounted) return;
        setError("Failed to load admin data");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const filteredAdminUsers = adminUsers.filter(admin =>
    admin.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    admin.user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    admin.role.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateAdmin = () => {
    const selectedRole = roles.find(role => role.id === newAdmin.roleId);
    if (!selectedRole) return;

    const newAdminUser: AdminUserWithDetails = {
      id: `admin-${Date.now()}`,
      userId: `user-${Date.now()}`,
      roleId: newAdmin.roleId,
      isActive: true,
      createdBy: adminUser,
      createdAt: new Date(),
      updatedAt: new Date(),
      user: {
        id: `user-${Date.now()}`,
        name: newAdmin.email.split('@')[0],
        email: newAdmin.email,
        image: null,
      },
      role: {
        ...selectedRole,
        permissions: JSON.parse((selectedRole as unknown as { permissions: string }).permissions),
      },
    };

    setAdminUsers([...adminUsers, newAdminUser]);
    setNewAdmin({ email: "", roleId: "" });
    setIsCreateDialogOpen(false);
  };

  const handleEditAdmin = (admin: AdminUserWithDetails) => {
    setEditingAdmin(admin);
    setIsEditDialogOpen(true);
  };

  const handleUpdateAdmin = () => {
    if (!editingAdmin) return;

    setAdminUsers(adminUsers.map(admin =>
      admin.id === editingAdmin.id
        ? { ...editingAdmin, updatedAt: new Date() }
        : admin
    ));
    setIsEditDialogOpen(false);
    setEditingAdmin(null);
  };

  const handleToggleActive = (adminId: string) => {
    setAdminUsers(adminUsers.map(admin =>
      admin.id === adminId
        ? { ...admin, isActive: !admin.isActive, updatedAt: new Date() }
        : admin
    ));
  };

  const handleDeleteAdmin = async (adminId: string) => {
    const target = adminUsers.find(a => a.id === adminId);
    if (!target) return;

    // Prevent self-delete on client as extra safety
    if (target.user?.id === adminUser.user?.id) {
      alert('You cannot delete your own account');
      return;
    }

    if (confirm("Are you sure you want to remove this user? This action cannot be undone.")) {
      try {
        const baseUserId = target.user?.id || target.userId;
        const res = await fetch(`/api/admin/users/${baseUserId}`, { method: 'DELETE' });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Failed to delete user');
        }
        setAdminUsers(adminUsers.filter(admin => admin.id !== adminId));
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : 'Failed to delete user';
        alert(errorMessage);
      }
    }
  };

  const getRoleDisplayName = (roleName: string) => {
    return roleName.replace('_', ' ').toUpperCase();
  };

  const getRoleColor = (roleName: string) => {
    switch (roleName) {
      case 'manager':
        return 'destructive';
      case 'admin':
        return 'default';
      case 'customer':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Admin Users</h1>
          <p className="text-muted-foreground mt-1">
            Manage admin users and their permissions
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Add Admin
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Admin User</DialogTitle>
              <DialogDescription>
                Grant admin access to a user by email address.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={newAdmin.email}
                  onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                  placeholder="user@example.com"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="role">Admin Role</Label>
                <Select value={newAdmin.roleId} onValueChange={(value) => setNewAdmin({ ...newAdmin, roleId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        <div>
                          <div className="font-medium">{getRoleDisplayName(role.name)}</div>
                          <div className="text-sm text-gray-500">{role.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateAdmin} disabled={!newAdmin.email || !newAdmin.roleId}>
                Add Admin
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Admins</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{adminUsers.length}</div>
            <p className="text-xs text-muted-foreground">
              Admin users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Admins</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {adminUsers.filter(admin => admin.isActive).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Currently active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Managers</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {adminUsers.filter(admin => admin.role.name === 'manager').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Full access
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive Admins</CardTitle>
            <UserX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">
              {adminUsers.filter(admin => !admin.isActive).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Disabled accounts
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search admin users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Admin Users Table */}
      <Card>
        {loading && (
          <CardHeader>
            <CardDescription>Loading admin users…</CardDescription>
          </CardHeader>
        )}
        {error && (
          <CardHeader>
            <CardDescription className="text-destructive">{error}</CardDescription>
          </CardHeader>
        )}
        <CardHeader>
          <CardTitle>Admin Users ({filteredAdminUsers.length})</CardTitle>
          <CardDescription>
            Manage admin users and their access levels
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAdminUsers.map((admin) => (
                <TableRow key={admin.id} className="bg-card">
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={admin.user.image || undefined} alt={admin.user.name} />
                        <AvatarFallback>
                          {admin.user.name?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{admin.user.name}</div>
                        <div className="text-sm text-muted-foreground">{admin.user.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getRoleColor(admin.role.name) as VariantProps<typeof badgeVariants>["variant"]}>
                      {getRoleDisplayName(admin.role.name)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div className="grid grid-cols-2 gap-1">
                        {Object.entries(admin.role.permissions).map(([key, value]) => (
                          <div key={key} className="flex items-center space-x-1">
                            <div className={`w-2 h-2 rounded-full ${value ? 'bg-green-500' : 'bg-gray-300'}`} />
                            <span className="text-xs">{key.replace('can', '').replace(/([A-Z])/g, ' $1').trim()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={admin.isActive}
                        onCheckedChange={() => handleToggleActive(admin.id)}
                      />
                      <Badge variant={admin.isActive ? "default" : "secondary"}>
                        {admin.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {(() => {
                        const d = new Date(admin.createdAt as unknown as string);
                        return isNaN(d.getTime()) ? "" : d.toLocaleDateString();
                      })()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-muted-foreground">
                      {(() => {
                        const createdById = typeof admin.createdBy === "string" ? admin.createdBy : admin.createdBy?.id;
                        if (!createdById) return "System";
                        return adminUsers.find((a) => a.id === createdById)?.user.name || "Unknown";
                      })()}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditAdmin(admin)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {(() => {
                        const roleName = adminUser.role?.name;
                        const isManager = roleName === 'manager';
                        const isSelf = admin.user?.id === adminUser.user?.id;
                        const canDeleteTarget = isManager && !isSelf;
                        const title = !canDeleteTarget
                          ? (isSelf ? 'You cannot delete your own account' : 'Only managers can delete users')
                          : 'Delete user';
                        return (
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={!canDeleteTarget}
                            onClick={() => canDeleteTarget && handleDeleteAdmin(admin.id)}
                            title={title}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        );
                      })()}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Admin User</DialogTitle>
            <DialogDescription>
              Update the admin user&apos;s role and permissions.
            </DialogDescription>
          </DialogHeader>
          {editingAdmin && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-role">Admin Role</Label>
                <Select 
                  value={editingAdmin.roleId} 
                  onValueChange={(value) => {
                    const selectedRole = roles.find(role => role.id === value);
                    if (selectedRole) {
                      setEditingAdmin({
                        ...editingAdmin,
                        roleId: value,
                        role: {
                          ...selectedRole,
                          permissions: JSON.parse((selectedRole as unknown as { permissions: string }).permissions),
                        },
                      });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        <div>
                          <div className="font-medium">{getRoleDisplayName(role.name)}</div>
                          <div className="text-sm text-gray-500">{role.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-isActive"
                  checked={editingAdmin.isActive}
                  onCheckedChange={(checked) => setEditingAdmin({ ...editingAdmin, isActive: checked })}
                />
                <Label htmlFor="edit-isActive">Active</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateAdmin}>
              Update Admin
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
