"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Filter } from "lucide-react";

import { Button } from "@/ui/primitives/button";
import { Input } from "@/ui/primitives/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/primitives/card";
import { Badge } from "@/ui/primitives/badge";
// import { ResponsiveTable } from "./responsive-table"; // Not used currently
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/ui/primitives/dialog";
import { Label } from "@/ui/primitives/label";
import { Textarea } from "@/ui/primitives/textarea";
import { Switch } from "@/ui/primitives/switch";
import { FallbackImage } from "@/ui/components/fallback-image";
import type { AdminUserWithDetails, Category } from "@/db/schema";

interface CategoryManagementProps {
  adminUser: AdminUserWithDetails;
}

export function CategoryManagement({ }: CategoryManagementProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [newCategory, setNewCategory] = useState({
    name: "",
    description: "",
    image: "",
    isActive: true,
  });

  // Fetch categories from API
  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || []);
      } else {
        console.error('Failed to fetch categories');
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load categories on component mount
  useEffect(() => {
    fetchCategories();
  }, []);

  const filteredCategories = categories.filter((category) =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (category.description?.toLowerCase() || "").includes(searchQuery.toLowerCase())
  );

  const handleCreateCategory = async () => {
    try {
      const response = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newCategory),
      });

      if (response.ok) {
        const data = await response.json();
        setCategories([...categories, data.category]);
        setNewCategory({
          name: "",
          description: "",
          image: "",
          isActive: true,
        });
        setIsCreateDialogOpen(false);
      } else {
        const error = await response.json();
        console.error('Failed to create category:', error);
        alert('Failed to create category: ' + (error.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error creating category:', error);
      alert('Error creating category. Please try again.');
    }
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setIsEditDialogOpen(true);
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory) return;

    try {
      const response = await fetch(`/api/admin/categories/${editingCategory.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editingCategory),
      });

      if (response.ok) {
        const data = await response.json();
        setCategories(categories.map(cat =>
          cat.id === editingCategory.id ? data.category : cat
        ));
        setIsEditDialogOpen(false);
        setEditingCategory(null);
      } else {
        const error = await response.json();
        console.error('Failed to update category:', error);
        alert('Failed to update category: ' + (error.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error updating category:', error);
      alert('Error updating category. Please try again.');
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (confirm("Are you sure you want to delete this category?")) {
      try {
        const response = await fetch(`/api/admin/categories/${categoryId}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          setCategories(categories.filter(cat => cat.id !== categoryId));
        } else {
          const error = await response.json();
          console.error('Failed to delete category:', error);
          alert('Failed to delete category: ' + (error.error || 'Unknown error'));
        }
      } catch (error) {
        console.error('Error deleting category:', error);
        alert('Error deleting category. Please try again.');
      }
    }
  };

  const handleToggleActive = async (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    if (!category) return;

    try {
      const response = await fetch(`/api/admin/categories/${categoryId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...category,
          isActive: !category.isActive,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setCategories(categories.map(cat =>
          cat.id === categoryId ? data.category : cat
        ));
      } else {
        const error = await response.json();
        console.error('Failed to toggle category status:', error);
        alert('Failed to update category status: ' + (error.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error toggling category status:', error);
      alert('Error updating category status. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Categories</h1>
          <p className="text-muted-foreground mt-1">
            Manage your product categories and organization
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create New Category</DialogTitle>
              <DialogDescription>
                Add a new product category to organize your inventory.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Category Name</Label>
                <Input
                  id="name"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                  placeholder="e.g., Prescriptions"
                />
              </div>
              {/* Slug removed; auto-generated from name */}
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newCategory.description}
                  onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                  placeholder="Brief description of this category"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="image">Image URL</Label>
                <Input
                  id="image"
                  value={newCategory.image}
                  onChange={(e) => setNewCategory({ ...newCategory, image: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                />
              </div>
              {/* Sort order removed */}
              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={newCategory.isActive}
                  onCheckedChange={(checked) => setNewCategory({ ...newCategory, isActive: checked })}
                />
                <Label htmlFor="isActive">Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateCategory}>
                Create Category
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search categories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Categories Grid */}
      <Card>
        <CardHeader>
          <CardTitle>All Categories ({filteredCategories.length})</CardTitle>
          <CardDescription>Manage your product categories and their settings</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading categories...</div>
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">No categories found</div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
              {filteredCategories.map((item) => (
                <div key={item.id} className="group overflow-hidden rounded-lg border bg-card shadow-sm transition hover:shadow-md">
                  <div className="relative aspect-[4/3] bg-muted">
                    <FallbackImage
                      alt={item.name}
                      className=""
                      fill
                      loading="lazy"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                      src={item.image || ""}
                    />
                    <div className="absolute left-2 top-2">
                      <Badge variant={item.isActive ? "default" : "secondary"}>
                        {item.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-2 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold sm:text-base">{item.name}</div>
                        <div className="truncate text-xs text-muted-foreground">{item.slug}</div>
                      </div>
                      <Badge variant="secondary">{(item as Category & { productCount?: number }).productCount ?? 0} products</Badge>
                    </div>
                    {item.description && (
                      <div className="line-clamp-2 text-xs text-muted-foreground sm:text-sm">
                        {item.description}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between border-t p-3">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={Boolean(item.isActive)}
                        onCheckedChange={() => handleToggleActive(item.id)}
                      />
                      <span className="text-xs text-muted-foreground">Toggle</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button onClick={() => handleEditCategory(item)} size="sm" variant="outline">
                        Edit
                      </Button>
                      <Button onClick={() => handleDeleteCategory(item.id)} size="sm" variant="destructive">
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>
              Update the category information.
            </DialogDescription>
          </DialogHeader>
          {editingCategory && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name">Category Name</Label>
                <Input
                  id="edit-name"
                  value={editingCategory.name}
                  onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-slug">Slug</Label>
                <Input
                  id="edit-slug"
                  value={editingCategory.slug}
                  onChange={(e) => setEditingCategory({ ...editingCategory, slug: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editingCategory.description || ""}
                  onChange={(e) => setEditingCategory({ ...editingCategory, description: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-image">Image URL</Label>
                <Input
                  id="edit-image"
                  value={editingCategory.image || ""}
                  onChange={(e) => setEditingCategory({ ...editingCategory, image: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                {/* Sort order removed */}
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-isActive"
                  checked={editingCategory.isActive}
                  onCheckedChange={(checked) => setEditingCategory({ ...editingCategory, isActive: checked })}
                />
                <Label htmlFor="edit-isActive">Active</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateCategory}>
              Update Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
