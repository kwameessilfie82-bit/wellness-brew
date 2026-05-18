import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { userTable } from "@/db/schema";

export type UpdateProfileInput = {
  name?: string;
  phone?: string | null;
  deliveryRegion?: string | null;
  deliveryLocation?: string | null;
  deliveryLandmark?: string | null;
  deliveryLatitude?: string | null;
  deliveryLongitude?: string | null;
};

export async function getUserProfile(userId: string) {
  return db.query.userTable.findFirst({
    where: eq(userTable.id, userId),
  });
}

export async function updateUserProfile(userId: string, input: UpdateProfileInput) {
  const now = new Date();
  await db
    .update(userTable)
    .set({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      ...(input.deliveryRegion !== undefined
        ? { deliveryRegion: input.deliveryRegion }
        : {}),
      ...(input.deliveryLocation !== undefined
        ? { deliveryLocation: input.deliveryLocation }
        : {}),
      ...(input.deliveryLandmark !== undefined
        ? { deliveryLandmark: input.deliveryLandmark }
        : {}),
      ...(input.deliveryLatitude !== undefined
        ? { deliveryLatitude: input.deliveryLatitude }
        : {}),
      ...(input.deliveryLongitude !== undefined
        ? { deliveryLongitude: input.deliveryLongitude }
        : {}),
      updatedAt: now,
    })
    .where(eq(userTable.id, userId));

  return getUserProfile(userId);
}
