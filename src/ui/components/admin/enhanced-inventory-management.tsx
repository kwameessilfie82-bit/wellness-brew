"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Minus, Loader2, Plus, Search, AlertTriangle, TrendingUp, TrendingDown, Package, Edit, Trash2, CheckSquare } from "lucide-react";

import { Button } from "@/ui/primitives/button";
import { Input } from "@/ui/primitives/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/primitives/card";
import { Badge } from "@/ui/primitives/badge";
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
import { Textarea } from "@/ui/primitives/textarea";
import { FallbackImage } from "@/ui/components/fallback-image";
import { compressImageFile } from "@/lib/image-compress";
import type { AdminUserWithDetails, Inventory, Product, Category } from "@/db/schema";

interface InventoryManagementProps {
  adminUser: AdminUserWithDetails;
  initialProducts: Product[];
  initialInventory: Inventory[];
  initialCategories: Category[];
}

export function EnhancedInventoryManagement({
  initialProducts,
  initialInventory,
  initialCategories,
}: InventoryManagementProps) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [inventory, setInventory] = useState<Inventory[]>(initialInventory);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isStockDialogOpen, setIsStockDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  // Client form state
  const [clientForm, setClientForm] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
  });
  
  const [stockForm, setStockForm] = useState({
    quantityInStock: 0,
    quantityReserved: 0,
    lowStockThreshold: 10,
    // reorderPoint removed from UI (kept here for potential future use)
    reorderPoint: 5,
    // reorderQuantity removed from UI (kept here for potential future use)
    reorderQuantity: 50,
  });
  // New product form state
  const [newProduct, setNewProduct] = useState({
    name: "",
    slug: "",
    description: "",
    shortDescription: "",
    categoryId: "",
    price: "",
    originalPrice: "",
    sku: "",
    barcode: "",
    images: "",
    isActive: true,
    isFeatured: false,
    requiresPrescription: false,
    weight: "",
    manufacturer: "",
    expiryDate: "",
    batchNumber: "",
    tags: "",
    seoTitle: "",
    seoDescription: "",
  });

  // Image handling state for create/edit
  const [newProductImages, setNewProductImages] = useState<string[]>([]);
  const [editProductImages, setEditProductImages] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSavingStock, setIsSavingStock] = useState(false);
  const [updatingReserved, setUpdatingReserved] = useState<string | null>(null);
  const addImageFile = async (file: File, isEdit = false) => {
    if (!file) return;
    // Guard against absurd originals; anything reasonable is auto-compressed below.
    if (file.size > 25 * 1024 * 1024) {
      alert("Image is too large (max 25MB).");
      return;
    }
    const setFn = isEdit ? setEditProductImages : setNewProductImages;
    try {
      // Downscale + re-encode in the browser so the owner can upload any photo.
      const dataUrl = await compressImageFile(file);
      // Single-image policy: always override with the latest
      setFn([dataUrl]);
    } catch {
      const reader = new FileReader();
      reader.onload = () => setFn([reader.result as string]);
      reader.readAsDataURL(file);
    }
  };

  const removeImageAt = (index: number, isEdit = false) => {
    const setFn = isEdit ? setEditProductImages : setNewProductImages;
    const getArr = isEdit ? editProductImages : newProductImages;
    setFn(getArr.filter((_, i) => i !== index));
  };

  // Initialize edit images when opening the edit dialog
  useEffect(() => {
    if (isEditDialogOpen && editingProduct) {
      try {
        const parsed = JSON.parse(editingProduct.images || "[]");
        if (Array.isArray(parsed)) {
          setEditProductImages(parsed.length > 0 ? [parsed[0]] : []);
        } else {
          setEditProductImages([]);
        }
      } catch {
        setEditProductImages([]);
      }
    }
  }, [isEditDialogOpen, editingProduct]);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/categories?forInventory=true");
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  }, []);

  const loadInventory = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.set("minimal", "1");
      params.set("limit", "200");

      if (searchQuery.trim()) {
        params.set("search", searchQuery.trim());
      }
      if (selectedCategory && selectedCategory !== "all") {
        params.set("categoryId", selectedCategory);
      }
      if (selectedFilter && selectedFilter !== "all") {
        params.set("status", selectedFilter);
      }

      const res = await fetch(`/api/admin/inventory?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        return;
      }
      const data = await res.json();

      setProducts(data.products || []);

      const inventoryData =
        data.products
          ?.map(
            (product: Product & { inventory?: Inventory }) => product.inventory,
          )
          .filter(Boolean) || [];
      setInventory(inventoryData);
    } catch (error) {
      console.error("Error loading inventory:", error);
    }
  }, [searchQuery, selectedCategory, selectedFilter]);

  const refreshInventoryData = useCallback(async () => {
    await Promise.all([fetchCategories(), loadInventory()]);
  }, [fetchCategories, loadInventory]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didMountRef = useRef(false);

  useEffect(() => {
    // The server already provided the initial list for the default filters,
    // so skip the first run and only refetch when a filter/search changes.
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      void loadInventory();
    }, searchQuery.trim() ? 300 : 0);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [loadInventory, searchQuery, selectedCategory, selectedFilter]);

  const getCategoryName = (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category?.name || "Unknown";
  };

  // Get inventory data for a product
  const getInventoryData = (productId: string) => {
    return inventory.find(inv => inv.productId === productId);
  };

  // Server applies search/category/status filters
  const filteredProducts = products;

  // Sort so items needing finalization (reserved > 0) appear first; then by reserved desc
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    const aInv = getInventoryData(a.id);
    const bInv = getInventoryData(b.id);
    const aRes = aInv?.quantityReserved ?? 0;
    const bRes = bInv?.quantityReserved ?? 0;
    if ((aRes > 0) !== (bRes > 0)) return bRes > 0 ? 1 : -1; // true first
    return bRes - aRes; // higher reserved first
  });

  // Handle redirect to invoice generator with client data
  const handleGoToInvoiceGenerator = () => {
    if (!clientForm.name || !clientForm.phone || !clientForm.address) {
      alert("Please fill in all required fields (Name, Phone, Address)");
      return;
    }

    // Get reserved products
    const reservedProducts = products.filter(product => {
      const inv = getInventoryData(product.id);
      return inv && inv.quantityReserved > 0;
    });

    if (reservedProducts.length === 0) {
      alert("No reserved items found");
      return;
    }

    // Store client data and reserved products in sessionStorage for the invoice generator
    const invoiceData = {
      client: {
        name: clientForm.name,
        address: clientForm.address,
        phone: clientForm.phone,
        email: clientForm.email || "",
      },
      reservedProducts: reservedProducts.map(product => {
        const inv = getInventoryData(product.id);
        return {
          id: product.id,
          name: product.name,
          description: product.description || "",
          price: parseFloat(product.price),
          quantity: inv?.quantityReserved || 0,
        };
      }),
      fromInventory: true, // Flag to indicate this came from inventory page
    };

    // Store the data in sessionStorage
    sessionStorage.setItem('invoiceFromInventory', JSON.stringify(invoiceData));

    // Redirect to invoice generator with preview tab
    window.location.href = '/admin/invoice-generator?tab=preview';
  };

  // Get status badge for inventory
  const getStatusBadge = (inventoryData: Inventory | undefined) => {
    if (!inventoryData) return <Badge variant="secondary">No Inventory</Badge>;
    
    if (inventoryData.quantityInStock <= 0) {
      return <Badge variant="destructive">Out of Stock</Badge>;
    } else if (inventoryData.quantityInStock <= inventoryData.lowStockThreshold) {
      return <Badge variant="destructive">Low Stock</Badge>;
    } else {
      return <Badge variant="default">In Stock</Badge>;
    }
  };

  // Create new product
  const handleCreateProduct = async () => {
    // Client-side validation: name, price, category, description required; others optional
    const errors: string[] = [];
    if (!newProduct.name.trim()) errors.push("Product name is required");
    if (!newProduct.description.trim()) errors.push("Product description is required");
    if (!newProduct.categoryId) errors.push("Category is required");
    if (!newProduct.price || isNaN(Number(newProduct.price))) errors.push("Valid price is required");
    if (errors.length > 0) {
      alert(errors.join("\n"));
      return;
    }
    try {
      setIsCreating(true);
      const response = await fetch('/api/admin/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-product',
          ...newProduct,
          images: newProductImages.length > 0 ? newProductImages : [],
        }),
      });

      if (response.ok) {
        setIsCreateDialogOpen(false);
        setNewProduct({
          name: "", slug: "", description: "", shortDescription: "",
          categoryId: "", price: "", originalPrice: "", sku: "",
          barcode: "", images: "", isActive: true, isFeatured: false,
          requiresPrescription: false, weight: "", manufacturer: "",
          expiryDate: "", batchNumber: "", tags: "", seoTitle: "", seoDescription: "",
        });
        setNewProductImages([]);
        void refreshInventoryData();
      }
    } catch (error) {
      console.error('Error creating product:', error);
    } finally {
      setIsCreating(false);
    }
  };

  // Update product
  const handleUpdateProduct = async () => {
    if (!editingProduct || !editingProduct.id) {
      console.error('❌ No editing product or missing ID');
      return;
    }

    try {
      setIsUpdating(true);
      const url = `/api/admin/inventory/${editingProduct.id}`;
      console.log('🔍 Updating product at URL:', url);
      const response = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editingProduct,
          images: editProductImages.length > 0 ? editProductImages : [],
        }),
      });

      if (response.ok) {
        setIsEditDialogOpen(false);
        setEditingProduct(null);
        setEditProductImages([]);
        // Clear an active search so a renamed product isn't hidden by a stale
        // term that no longer matches its new name.
        if (searchQuery.trim()) {
          setSearchQuery("");
        }
        void refreshInventoryData();
      }
    } catch (error) {
      console.error('Error updating product:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  // Delete product
  const handleDeleteProduct = async (productId: string) => {
    if (!productId) {
      console.error('❌ No product ID provided for deletion');
      return;
    }
    
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      const url = `/api/admin/inventory/${productId}`;
      console.log('🔍 Deleting product at URL:', url);
      const response = await fetch(url, {
        method: 'DELETE',
      });

      if (response.ok) {
        void refreshInventoryData();
      }
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  // Finalize: set reserved to 0 so available equals current stock
  const handleFinalizeReservations = async (productId: string) => {
    try {
      await fetch(`/api/admin/inventory/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ finalizeReservations: true }),
      });
      void refreshInventoryData();
    } catch (error) {
      console.error('Error finalizing reservations:', error);
    }
  };

  const handleReservedChange = async (productId: string, newReserved: number) => {
    if (updatingReserved === productId) return; // Prevent multiple clicks
    
    try {
      setUpdatingReserved(productId);
      const inventoryData = getInventoryData(productId);
      if (!inventoryData) return;
      
      // Validate: reserved cannot exceed stock
      if (newReserved > inventoryData.quantityInStock) {
        alert("Reserved quantity cannot exceed current stock");
        return;
      }
      
      // Validate: reserved cannot be negative
      if (newReserved < 0) {
        alert("Reserved quantity cannot be negative");
        return;
      }

      await fetch(`/api/admin/inventory/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          quantityReserved: newReserved,
          // Keep other fields unchanged
          quantityInStock: inventoryData.quantityInStock,
          lowStockThreshold: inventoryData.lowStockThreshold,
        }),
      });
      
      // Refresh the data
      void refreshInventoryData();
    } catch (error) {
      console.error('Error updating reserved quantity:', error);
      alert('Failed to update reserved quantity');
    } finally {
      setUpdatingReserved(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                Add Product
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Product</DialogTitle>
              <DialogDescription>
                Create a new product and add it to your inventory
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Product Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                    placeholder="Enter product name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sku">SKU</Label>
                  <Input
                    id="sku"
                    value={newProduct.sku}
                    onChange={(e) => setNewProduct({...newProduct, sku: e.target.value})}
                    placeholder="Enter SKU"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="manufacturer">Manufacturer</Label>
                  <Input
                    id="manufacturer"
                    value={newProduct.manufacturer}
                    onChange={(e) => setNewProduct({...newProduct, manufacturer: e.target.value})}
                    placeholder="Enter manufacturer"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="barcode">Barcode</Label>
                  <Input
                    id="barcode"
                    value={newProduct.barcode}
                    onChange={(e) => setNewProduct({...newProduct, barcode: e.target.value})}
                    placeholder="Enter barcode"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">
                    Price <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="price"
                    type="number"
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({...newProduct, price: e.target.value})}
                    placeholder="0.00"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">
                    Category <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={newProduct.categoryId}
                    onValueChange={(value) => setNewProduct({...newProduct, categoryId: value})}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">
                  Description <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="description"
                  value={newProduct.description}
                  onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                  placeholder="Enter product description"
                  required
                />
              </div>
              {/* Images: upload from device only */}
              <div className="space-y-2">
                <Label>Images</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) addImageFile(file, false);
                      // reset input so the same file can be chosen again if needed
                      e.currentTarget.value = "";
                    }}
                  />
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <div className="relative group aspect-square rounded overflow-hidden border">
                    {newProductImages[0] && (newProductImages[0].startsWith('data:') || newProductImages[0].startsWith('blob:')) ? (
                      <img alt="New product image" className="h-full w-full object-cover" src={newProductImages[0]} />
                    ) : (
                      <FallbackImage src={newProductImages[0] || "/placeholder.svg"} alt="New product image" className="object-cover" fill sizes="(max-width: 768px) 100vw, 600px" />
                    )}
                    {newProductImages.length > 0 && (
                      <Button
                        size="sm"
                        variant="destructive"
                        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeImageAt(0, false)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateProduct} disabled={isCreating} aria-busy={isCreating}>
                {isCreating ? (
                  <span className="inline-flex items-center gap-2 text-primary-foreground">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Creating...
                  </span>
                ) : (
                  "Create Product"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Edit Product Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Product</DialogTitle>
              <DialogDescription>
                Update product information
              </DialogDescription>
            </DialogHeader>
            {editingProduct && (
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name">Product Name</Label>
                    <Input
                      id="edit-name"
                      value={editingProduct.name}
                      onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})}
                      placeholder="Enter product name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-sku">SKU</Label>
                    <Input
                      id="edit-sku"
                      value={editingProduct.sku}
                      onChange={(e) => setEditingProduct({...editingProduct, sku: e.target.value})}
                      placeholder="Enter SKU"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-manufacturer">Manufacturer</Label>
                    <Input
                      id="edit-manufacturer"
                      value={editingProduct.manufacturer || ""}
                      onChange={(e) => setEditingProduct({...editingProduct, manufacturer: e.target.value})}
                      placeholder="Enter manufacturer"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-barcode">Barcode</Label>
                    <Input
                      id="edit-barcode"
                      value={editingProduct.barcode || ""}
                      onChange={(e) => setEditingProduct({...editingProduct, barcode: e.target.value})}
                      placeholder="Enter barcode"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-price">Price</Label>
                    <Input
                      id="edit-price"
                      type="number"
                      value={editingProduct.price}
                      onChange={(e) => setEditingProduct({...editingProduct, price: e.target.value})}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-category">Category</Label>
                    <Select
                      value={editingProduct.categoryId}
                      onValueChange={(value) => setEditingProduct({...editingProduct, categoryId: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea
                    id="edit-description"
                    value={editingProduct.description || ""}
                    onChange={(e) => setEditingProduct({...editingProduct, description: e.target.value})}
                    placeholder="Enter product description"
                  />
                </div>
                {/* Edit Images: upload from device only */}
                <div className="space-y-2">
                  <Label>Images</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) addImageFile(file, true);
                        e.currentTarget.value = "";
                      }}
                    />
                  </div>
                  {/* Initialize edit images from existing product images once */}
                  {(() => {
                    try {
                      if (editProductImages.length === 0 && editingProduct?.images) {
                        const parsed = JSON.parse(editingProduct.images || "[]");
                        if (Array.isArray(parsed)) {
                          setEditProductImages(parsed);
                        }
                      }
                    } catch {}
                    return null;
                  })()}
                  <div className="grid grid-cols-1 gap-2">
                    <div className="relative group aspect-square rounded overflow-hidden border">
                      {editProductImages[0] && (editProductImages[0].startsWith('data:') || editProductImages[0].startsWith('blob:')) ? (
                        <img alt="Product image" className="h-full w-full object-cover" src={editProductImages[0]} />
                      ) : (
                        <FallbackImage src={editProductImages[0] || "/placeholder.svg"} alt="Product image" className="object-cover" fill sizes="(max-width: 768px) 100vw, 600px" />
                      )}
                      {editProductImages.length > 0 && (
                        <Button
                          size="sm"
                          variant="destructive"
                          className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeImageAt(0, true)}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateProduct} disabled={isUpdating} aria-busy={isUpdating}>
                {isUpdating ? (
                  <span className="inline-flex items-center gap-2 text-primary-foreground">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Updating...
                  </span>
                ) : (
                  "Update Product"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      {/* Stats Cards */}
      {/* Inventory Stats - Mobile Optimized */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        <Card className="group hover:shadow-lg transition-all duration-300 border-border/50 hover:border-primary/30 bg-gradient-to-br from-background to-background/80">
          <CardContent className="p-4">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="text-2xl sm:text-3xl font-bold text-primary group-hover:scale-110 transition-transform duration-300">
                {products.length}
              </div>
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <div className="text-xs sm:text-sm font-medium text-muted-foreground">Total Products</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="group hover:shadow-lg transition-all duration-300 border-border/50 hover:border-green-300 bg-gradient-to-br from-background to-green-50/20">
          <CardContent className="p-4">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="text-2xl sm:text-3xl font-bold text-green-600 group-hover:scale-110 transition-transform duration-300">
                {inventory.filter(inv => inv.quantityInStock > 0).length}
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <div className="text-xs sm:text-sm font-medium text-muted-foreground">In Stock</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="group hover:shadow-lg transition-all duration-300 border-border/50 hover:border-yellow-300 bg-gradient-to-br from-background to-yellow-50/20">
          <CardContent className="p-4">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="text-2xl sm:text-3xl font-bold text-yellow-600 group-hover:scale-110 transition-transform duration-300">
                {inventory.filter(inv => inv.quantityInStock <= inv.lowStockThreshold && inv.quantityInStock > 0).length}
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <div className="text-xs sm:text-sm font-medium text-muted-foreground">Low Stock</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="group hover:shadow-lg transition-all duration-300 border-border/50 hover:border-red-300 bg-gradient-to-br from-background to-red-50/20">
          <CardContent className="p-4">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="text-2xl sm:text-3xl font-bold text-red-600 group-hover:scale-110 transition-transform duration-300">
                {inventory.filter(inv => inv.quantityInStock <= 0).length}
              </div>
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-500" />
                <div className="text-xs sm:text-sm font-medium text-muted-foreground">Out of Stock</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="flex-1">
              <Label htmlFor="search" className="mb-2">Search Products</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by name or SKU..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="flex-1">
              <Label htmlFor="category" className="mb-2">Category</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label htmlFor="status" className="mb-2">Status</Label>
              <Select value={selectedFilter} onValueChange={setSelectedFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="in-stock">In Stock</SelectItem>
                  <SelectItem value="low-stock">Low Stock</SelectItem>
                  <SelectItem value="out-of-stock">Out of Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Client Form for Invoice Generation */}
      {(() => {
        const hasReservedItems = inventory.some(inv => inv.quantityReserved > 0);
        if (!hasReservedItems) return null;
        
        return (
          <Card className="border-primary/90 bg-card">
            <CardHeader>
              <CardTitle className="text-primary">Generate Invoice</CardTitle>
              <CardDescription>
                Complete the client information below to generate an invoice for reserved items
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="client-name">Client Name *</Label>
                  <Input
                    id="client-name"
                    value={clientForm.name}
                    onChange={(e) => setClientForm({...clientForm, name: e.target.value})}
                    placeholder="Enter client name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client-phone">Phone Number *</Label>
                  <Input
                    id="client-phone"
                    value={clientForm.phone}
                    onChange={(e) => setClientForm({...clientForm, phone: e.target.value})}
                    placeholder="Enter phone number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client-address">Address *</Label>
                  <Input
                    id="client-address"
                    value={clientForm.address}
                    onChange={(e) => setClientForm({...clientForm, address: e.target.value})}
                    placeholder="Enter client address"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client-email">Email</Label>
                  <Input
                    id="client-email"
                    type="email"
                    value={clientForm.email}
                    onChange={(e) => setClientForm({...clientForm, email: e.target.value})}
                    placeholder="Enter email address"
                  />
                </div>
              </div>
               <div className="mt-4 flex justify-end">
                 <Button
                   onClick={handleGoToInvoiceGenerator}
                   disabled={!clientForm.name || !clientForm.phone || !clientForm.address}
                   className="bg-primary hover:bg-primary/90"
                 >
                   <CheckSquare className="mr-2 h-4 w-4" />
                   Go to Invoice Preview
                 </Button>
               </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle>Product Inventory</CardTitle>
          <CardDescription>
            Manage your product inventory and stock levels
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Current Stock</TableHead>
                <TableHead>Reserved</TableHead>
                <TableHead>Available</TableHead>
                <TableHead>Threshold</TableHead>
                <TableHead>Last Restocked</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedProducts.map((product) => {
                const inventoryData = getInventoryData(product.id);
                return (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md">
                          <FallbackImage
                            src={(() => {
                              try {
                                if (!product.images) return '/placeholder.svg';
                                const parsedImages = JSON.parse(product.images);
                                if (Array.isArray(parsedImages) && parsedImages.length > 0) {
                                  return parsedImages[0];
                                }
                                return '/placeholder.svg';
                              } catch (error) {
                                console.error('❌ Error parsing product images:', error, 'Images data:', product.images);
                                return '/placeholder.svg';
                              }
                            })()}
                            alt={product.name}
                            className="h-full w-full object-cover"
                            width={40}
                            height={40}
                          />
                        </div>
                        <div>
                          <div className="font-medium">{product.name}</div>
                          <div className="text-sm text-muted-foreground">{product.sku}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getCategoryName(product.categoryId)}</TableCell>
                    <TableCell>GHS {product.price}</TableCell>
                    <TableCell>{getStatusBadge(inventoryData)}</TableCell>
                    <TableCell>{new Date(product.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>{inventoryData?.quantityInStock || 0}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="min-w-[2rem] text-center">{inventoryData?.quantityReserved || 0}</span>
                        <div className="flex flex-col gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 w-6 p-0"
                            onClick={() => handleReservedChange(product.id, (inventoryData?.quantityReserved || 0) + 1)}
                            disabled={
                              (inventoryData?.quantityReserved || 0) >= (inventoryData?.quantityInStock || 0) ||
                              updatingReserved === product.id
                            }
                            title="Increase reserved"
                          >
                            {updatingReserved === product.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Plus className="h-3 w-3" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 w-6 p-0"
                            onClick={() => handleReservedChange(product.id, Math.max(0, (inventoryData?.quantityReserved || 0) - 1))}
                            disabled={
                              (inventoryData?.quantityReserved || 0) <= 0 ||
                              updatingReserved === product.id
                            }
                            title="Decrease reserved"
                          >
                            {updatingReserved === product.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Minus className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{inventoryData?.quantityAvailable || 0}</TableCell>
                    <TableCell>{inventoryData?.lowStockThreshold || 10}</TableCell>
                    <TableCell>
                      {inventoryData?.lastRestocked 
                        ? new Date(inventoryData.lastRestocked).toLocaleDateString()
                        : 'Never'
                      }
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedProduct(product);
                            const inv = getInventoryData(product.id);
                            setStockForm({
                              quantityInStock: inv?.quantityInStock ?? 0,
                              quantityReserved: inv?.quantityReserved ?? 0,
                              lowStockThreshold: inv?.lowStockThreshold ?? 10,
                              reorderPoint: inv?.reorderPoint ?? 5,
                              reorderQuantity: inv?.reorderQuantity ?? 50,
                            });
                            setIsStockDialogOpen(true);
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={(inventoryData?.quantityReserved || 0) === 0}
                          onClick={() => handleFinalizeReservations(product.id)}
                          title="Finalize: set reserved to 0"
                        >
                          <CheckSquare className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            try {
                              const res = await fetch(
                                `/api/admin/inventory/${product.id}`,
                              );
                              if (res.ok) {
                                const data = await res.json();
                                setEditingProduct(data.product ?? product);
                              } else {
                                setEditingProduct(product);
                              }
                            } catch {
                              setEditingProduct(product);
                            }
                            setIsEditDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteProduct(product.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Stock Edit Dialog */}
      <Dialog open={isStockDialogOpen} onOpenChange={setIsStockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Stock</DialogTitle>
            <DialogDescription>
              Update stock details for {selectedProduct?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="stock-in">Current Stock</Label>
                <Input
                  id="stock-in"
                  type="number"
                  value={stockForm.quantityInStock}
                  onChange={(e) => setStockForm({ ...stockForm, quantityInStock: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock-res">Reserved</Label>
                <Input
                  id="stock-res"
                  type="number"
                  value={stockForm.quantityReserved}
                  onChange={(e) => setStockForm({ ...stockForm, quantityReserved: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="stock-avail">Available (auto)</Label>
                <Input
                  id="stock-avail"
                  disabled
                  value={Math.max(0, (stockForm.quantityInStock || 0) - (stockForm.quantityReserved || 0))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock-threshold">Low Stock Threshold</Label>
                <Input
                  id="stock-threshold"
                  type="number"
                  value={stockForm.lowStockThreshold}
                  onChange={(e) => setStockForm({ ...stockForm, lowStockThreshold: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStockDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!selectedProduct) return;
                // Basic validation
                const nextIn = Math.max(0, stockForm.quantityInStock || 0);
                const nextRes = Math.max(0, stockForm.quantityReserved || 0);
                if (nextRes > nextIn) {
                  alert("Reserved cannot exceed Current Stock");
                  return;
                }
                try {
                  setIsSavingStock(true);
                  await fetch(`/api/admin/inventory/${selectedProduct.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      quantityInStock: nextIn,
                      quantityReserved: nextRes,
                      lowStockThreshold: stockForm.lowStockThreshold,
                      // Reorder fields intentionally omitted
                    }),
                  });
                  setIsStockDialogOpen(false);
                  setSelectedProduct(null);
                  void refreshInventoryData();
                } catch (error) {
                  console.error('Error saving stock:', error);
                  alert('Failed to save stock. Please try again.');
                } finally {
                  setIsSavingStock(false);
                }
              }}
              disabled={isSavingStock}
              aria-busy={isSavingStock}
            >
              {isSavingStock ? (
                <span className="inline-flex items-center gap-2 text-primary-foreground">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Saving...
                </span>
              ) : (
                'Save'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
