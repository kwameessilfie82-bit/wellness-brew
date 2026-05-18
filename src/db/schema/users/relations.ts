import { relations } from "drizzle-orm";

import { adminUserTable } from "../admin/tables";
import { sessionTable, userTable } from "./tables";

export const userRelations = relations(userTable, ({ many }) => ({
  sessions: many(sessionTable),
  adminUser: many(adminUserTable),
}));

export const sessionRelations = relations(sessionTable, ({ one }) => ({
  user: one(userTable, {
    fields: [sessionTable.userId],
    references: [userTable.id],
  }),
}));
