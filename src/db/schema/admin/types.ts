import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import {
  adminRoleTable,
  adminUserTable,
  categoryTable,
  productTable,
  inventoryTable,
  inventoryTransactionTable,
  productVariantTable,
} from "./tables";

// Admin Role Types
export type AdminRole = InferSelectModel<typeof adminRoleTable>;
export type NewAdminRole = InferInsertModel<typeof adminRoleTable>;

// Admin User Types
export type AdminUser = InferSelectModel<typeof adminUserTable>;
export type NewAdminUser = InferInsertModel<typeof adminUserTable>;

// Category Types
export type Category = InferSelectModel<typeof categoryTable>;
export type NewCategory = InferInsertModel<typeof categoryTable>;

// Product Types
export type Product = InferSelectModel<typeof productTable>;
export type NewProduct = InferInsertModel<typeof productTable>;

// Inventory Types
export type Inventory = InferSelectModel<typeof inventoryTable>;
export type NewInventory = InferInsertModel<typeof inventoryTable>;

// Inventory Transaction Types
export type InventoryTransaction = InferSelectModel<typeof inventoryTransactionTable>;
export type NewInventoryTransaction = InferInsertModel<typeof inventoryTransactionTable>;

// Product Variant Types
export type ProductVariant = InferSelectModel<typeof productVariantTable>;
export type NewProductVariant = InferInsertModel<typeof productVariantTable>;

// Extended types with relations
export interface CategoryWithProducts extends Category {
  products: Product[];
  _count: {
    products: number;
  };
}

export interface ProductWithDetails extends Product {
  category: Category;
  inventory: Inventory | null;
  variants: ProductVariant[];
  _count: {
    variants: number;
  };
}

export interface InventoryWithProduct extends Inventory {
  product: Product;
}

export interface InventoryTransactionWithDetails
  extends Omit<InventoryTransaction, "performedBy"> {
  product: Product;
  performedBy: AdminUser;
}

// Admin permissions type
export interface AdminPermissions {
  canManageProducts: boolean;
  canManageCategories: boolean;
  canManageInventory: boolean;
  canManageAdmins: boolean;
  canViewAnalytics: boolean;
  canManageOrders: boolean;
  canManageCustomers: boolean;
  canManageSettings: boolean;
}

// Admin role with permissions
export interface AdminRoleWithPermissions
  extends Omit<AdminRole, "permissions"> {
  permissions: AdminPermissions;
}

// Admin user with full details
export interface AdminUserWithDetails extends Omit<AdminUser, "createdBy"> {
  // Replace FK string with expanded relation
  createdBy: AdminUserWithDetails | null;
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
  role: AdminRoleWithPermissions;
}
