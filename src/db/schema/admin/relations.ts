import { relations } from "drizzle-orm";
import { userTable } from "../users/tables";
import {
  adminRoleTable,
  adminUserTable,
  categoryTable,
  productTable,
  inventoryTable,
  inventoryTransactionTable,
  productVariantTable,
} from "./tables";

// Admin role relations
export const adminRoleRelations = relations(adminRoleTable, ({ many }) => ({
  adminUsers: many(adminUserTable),
}));

// Admin user relations
export const adminUserRelations = relations(adminUserTable, ({ one, many }) => ({
  user: one(userTable, {
    fields: [adminUserTable.userId],
    references: [userTable.id],
  }),
  role: one(adminRoleTable, {
    fields: [adminUserTable.roleId],
    references: [adminRoleTable.id],
  }),
  createdBy: one(adminUserTable, {
    fields: [adminUserTable.createdBy],
    references: [adminUserTable.id],
  }),
  createdAdmins: many(adminUserTable),
  createdCategories: many(categoryTable),
  createdProducts: many(productTable),
  inventoryTransactions: many(inventoryTransactionTable),
}));

// Category relations
export const categoryRelations = relations(categoryTable, ({ one, many }) => ({
  createdBy: one(adminUserTable, {
    fields: [categoryTable.createdBy],
    references: [adminUserTable.id],
  }),
  products: many(productTable),
}));

// Product relations
export const productRelations = relations(productTable, ({ one, many }) => ({
  category: one(categoryTable, {
    fields: [productTable.categoryId],
    references: [categoryTable.id],
  }),
  createdBy: one(adminUserTable, {
    fields: [productTable.createdBy],
    references: [adminUserTable.id],
  }),
  inventory: one(inventoryTable, {
    fields: [productTable.id],
    references: [inventoryTable.productId],
  }),
  variants: many(productVariantTable),
  inventoryTransactions: many(inventoryTransactionTable),
}));

// Inventory relations
export const inventoryRelations = relations(inventoryTable, ({ one }) => ({
  product: one(productTable, {
    fields: [inventoryTable.productId],
    references: [productTable.id],
  }),
}));

// Inventory transaction relations
export const inventoryTransactionRelations = relations(inventoryTransactionTable, ({ one }) => ({
  product: one(productTable, {
    fields: [inventoryTransactionTable.productId],
    references: [productTable.id],
  }),
  performedBy: one(adminUserTable, {
    fields: [inventoryTransactionTable.performedBy],
    references: [adminUserTable.id],
  }),
}));

// Product variant relations
export const productVariantRelations = relations(productVariantTable, ({ one }) => ({
  product: one(productTable, {
    fields: [productVariantTable.productId],
    references: [productTable.id],
  }),
}));
