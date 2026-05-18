import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const userTable = pgTable("user", {
  age: integer("age"),
  createdAt: timestamp("created_at").notNull(),
  deliveryLandmark: text("delivery_landmark"),
  deliveryLatitude: text("delivery_latitude"),
  deliveryLocation: text("delivery_location"),
  deliveryLongitude: text("delivery_longitude"),
  deliveryRegion: text("delivery_region"),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull(),
  firstName: text("first_name"),
  id: text("id").primaryKey(),
  image: text("image"),
  lastName: text("last_name"),
  name: text("name").notNull(),
  phone: text("phone"),
  twoFactorEnabled: boolean("two_factor_enabled"),
  updatedAt: timestamp("updated_at").notNull(),
});

export const sessionTable = pgTable("session", {
  createdAt: timestamp("created_at").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  id: text("id").primaryKey(),
  ipAddress: text("ip_address"),
  token: text("token").notNull().unique(),
  updatedAt: timestamp("updated_at").notNull(),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => userTable.id, { onDelete: "cascade" }),
});

export const verificationTable = pgTable("verification", {
  createdAt: timestamp("created_at"),
  expiresAt: timestamp("expires_at").notNull(),
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  updatedAt: timestamp("updated_at"),
  value: text("value").notNull(),
});

export const twoFactorTable = pgTable("two_factor", {
  backupCodes: text("backup_codes").notNull(),
  id: text("id").primaryKey(),
  secret: text("secret").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => userTable.id, { onDelete: "cascade" }),
});
