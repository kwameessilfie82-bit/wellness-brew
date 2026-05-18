import { eq } from "drizzle-orm";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

import type { UserDbType } from "@/lib/auth-types";

import { db } from "@/db";
import { adminUserTable, userTable } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";

function mapSupabaseMetadata(user: SupabaseUser) {
  const metadata = user.user_metadata as Record<string, unknown>;
  const fullName =
    (metadata.full_name as string | undefined) ??
    (metadata.name as string | undefined) ??
    user.email?.split("@")[0] ??
    "User";

  return {
    firstName:
      (metadata.given_name as string | undefined) ??
      (metadata.first_name as string | undefined) ??
      null,
    image:
      (metadata.avatar_url as string | undefined) ??
      (metadata.picture as string | undefined) ??
      null,
    lastName:
      (metadata.family_name as string | undefined) ??
      (metadata.last_name as string | undefined) ??
      null,
    name: fullName,
  };
}

/**
 * Re-links a Better Auth user row to the Supabase auth user id (same email).
 * Order matters: create the new `user` row before updating FKs that reference it.
 */
async function migrateUserToSupabaseId(
  oldUser: UserDbType,
  supabaseUser: SupabaseUser,
  userData: {
    email: string;
    emailVerified: boolean;
    firstName: string | null;
    id: string;
    image: string | null;
    lastName: string | null;
    name: string;
    updatedAt: Date;
  },
): Promise<UserDbType> {
  const oldId = oldUser.id;
  const newId = supabaseUser.id;
  const now = userData.updatedAt;

  const alreadyMigrated = await db.query.userTable.findFirst({
    where: eq(userTable.id, newId),
  });

  if (alreadyMigrated) {
    await db.transaction(async (tx) => {
      await tx
        .update(adminUserTable)
        .set({ userId: newId, updatedAt: now })
        .where(eq(adminUserTable.userId, oldId));

      await tx
        .update(adminUserTable)
        .set({ createdBy: newId })
        .where(eq(adminUserTable.createdBy, oldId));

      await tx.delete(userTable).where(eq(userTable.id, oldId));
    });

    await db
      .update(userTable)
      .set({
        ...userData,
        age: alreadyMigrated.age,
        twoFactorEnabled: alreadyMigrated.twoFactorEnabled,
      })
      .where(eq(userTable.id, newId));

    return { ...alreadyMigrated, ...userData };
  }

  await db.transaction(async (tx) => {
    // Release unique email constraint on the legacy row
    await tx
      .update(userTable)
      .set({
        email: `migrated-${oldId}@archived.local`,
        updatedAt: now,
      })
      .where(eq(userTable.id, oldId));

    await tx.insert(userTable).values({
      age: oldUser.age,
      createdAt: oldUser.createdAt,
      email: userData.email,
      emailVerified: userData.emailVerified,
      firstName: userData.firstName,
      id: newId,
      image: userData.image,
      lastName: userData.lastName,
      name: userData.name,
      twoFactorEnabled: oldUser.twoFactorEnabled,
      updatedAt: now,
    });

    await tx
      .update(adminUserTable)
      .set({ userId: newId, updatedAt: now })
      .where(eq(adminUserTable.userId, oldId));

    await tx
      .update(adminUserTable)
      .set({ createdBy: newId })
      .where(eq(adminUserTable.createdBy, oldId));

    await tx.delete(userTable).where(eq(userTable.id, oldId));
  });

  return {
    age: oldUser.age,
    createdAt: oldUser.createdAt,
    deliveryLandmark: oldUser.deliveryLandmark,
    deliveryLatitude: oldUser.deliveryLatitude,
    deliveryLocation: oldUser.deliveryLocation,
    deliveryLongitude: oldUser.deliveryLongitude,
    deliveryRegion: oldUser.deliveryRegion,
    email: userData.email,
    emailVerified: userData.emailVerified,
    firstName: userData.firstName,
    id: newId,
    image: userData.image,
    lastName: userData.lastName,
    name: userData.name,
    phone: oldUser.phone,
    twoFactorEnabled: oldUser.twoFactorEnabled,
    updatedAt: now,
  };
}

export async function syncUserFromSupabase(
  supabaseUser: SupabaseUser,
): Promise<UserDbType> {
  const { firstName, image, lastName, name } = mapSupabaseMetadata(supabaseUser);
  const now = new Date();

  const existing = await db.query.userTable.findFirst({
    where: eq(userTable.id, supabaseUser.id),
  });

  const userData = {
    email: supabaseUser.email!,
    emailVerified: !!supabaseUser.email_confirmed_at,
    firstName: firstName ?? existing?.firstName ?? null,
    id: supabaseUser.id,
    image: image ?? existing?.image ?? null,
    lastName: lastName ?? existing?.lastName ?? null,
    name,
    updatedAt: now,
  };

  if (!existing && supabaseUser.email) {
    const existingByEmail = await db.query.userTable.findFirst({
      where: eq(userTable.email, supabaseUser.email),
    });

    if (existingByEmail && existingByEmail.id !== supabaseUser.id) {
      return migrateUserToSupabaseId(existingByEmail, supabaseUser, userData);
    }
  }

  if (existing) {
    await db
      .update(userTable)
      .set({
        ...userData,
        age: existing.age,
        twoFactorEnabled: existing.twoFactorEnabled,
      })
      .where(eq(userTable.id, supabaseUser.id));

    return { ...existing, ...userData };
  }

  const newUser: UserDbType = {
    age: null,
    createdAt: new Date(supabaseUser.created_at),
    deliveryLandmark: null,
    deliveryLatitude: null,
    deliveryLocation: null,
    deliveryLongitude: null,
    deliveryRegion: null,
    phone: null,
    ...userData,
    twoFactorEnabled: false,
  };

  await db.insert(userTable).values(newUser);
  return newUser;
}

export const getCurrentUser = async (): Promise<null | UserDbType> => {
  const supabase = await createClient();
  if (!supabase) {
    return null;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const existing = await db.query.userTable.findFirst({
    where: eq(userTable.id, user.id),
  });

  // Avoid a DB write on every API request; sync runs on OAuth callback for new users.
  if (existing) {
    return existing;
  }

  return syncUserFromSupabase(user);
};

export const getCurrentUserOrRedirect = async (
  forbiddenUrl = "/auth/sign-in",
  okUrl = "",
  ignoreForbidden = false,
): Promise<null | UserDbType> => {
  const user = await getCurrentUser();

  if (!user) {
    if (!ignoreForbidden) {
      redirect(forbiddenUrl);
    }
    return user;
  }

  if (okUrl) {
    redirect(okUrl);
  }

  return user;
};
