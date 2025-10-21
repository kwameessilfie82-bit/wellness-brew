import type { User } from "@/db/schema/users/types";

// The shape of the data expected by the table
// Includes user details and their admin role
export type UserWithRole = User & {
  adminRole?: {
    name: string;
    description: string;
  } | null;
};
