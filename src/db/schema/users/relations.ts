import { relations } from "drizzle-orm";

import { adminUserTable } from "../admin/tables";
import { accountTable, sessionTable, userTable } from "./tables";

export const userRelations = relations(userTable, ({ many }) => ({
  accounts: many(accountTable),
  sessions: many(sessionTable),
  adminUser: many(adminUserTable),
}));

export const sessionRelations = relations(sessionTable, ({ one }) => ({
  user: one(userTable, {
    fields: [sessionTable.userId],
    references: [userTable.id],
  }),
}));

export const accountRelations = relations(accountTable, ({ one }) => ({
  user: one(userTable, {
    fields: [accountTable.userId],
    references: [userTable.id],
  }),
}));
