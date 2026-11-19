import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { formatGhanaPhone } from "@/lib/ghana";
import { getUserProfile, updateUserProfile } from "@/lib/queries/profile";

const text = (max: number) => z.string().trim().max(max).nullish();

/** Accepts number or numeric string; "" / null clear the pin (never coerced to 0,0). */
const coord = (limit: number) =>
  z.preprocess(
    (v) => (v === "" ? null : v),
    z.coerce.number().min(-limit).max(limit).nullish(),
  );

const profileSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  phone: text(32),
  deliveryRegion: text(80),
  deliveryLocation: text(300),
  deliveryLandmark: text(300),
  deliveryLatitude: coord(90),
  deliveryLongitude: coord(180),
  age: z.number().int().min(0).max(130).nullish(),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await getUserProfile(user.id);
  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  return NextResponse.json({
    profile: {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      image: profile.image,
      phone: profile.phone,
      deliveryRegion: profile.deliveryRegion,
      deliveryLocation: profile.deliveryLocation,
      deliveryLandmark: profile.deliveryLandmark,
      deliveryLatitude: profile.deliveryLatitude,
      deliveryLongitude: profile.deliveryLongitude,
      createdAt: profile.createdAt,
    },
  });
}

export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = profileSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid profile data", issues: z.flattenError(parsed.error) },
      { status: 400 },
    );
  }
  const body = parsed.data;

  const profile = await updateUserProfile(user.id, {
    name: body.name,
    phone: body.phone != null ? formatGhanaPhone(body.phone) : undefined,
    deliveryRegion: body.deliveryRegion ?? undefined,
    deliveryLocation: body.deliveryLocation ?? undefined,
    deliveryLandmark: body.deliveryLandmark ?? undefined,
    deliveryLatitude:
      body.deliveryLatitude != null ? String(body.deliveryLatitude) : undefined,
    deliveryLongitude:
      body.deliveryLongitude != null
        ? String(body.deliveryLongitude)
        : undefined,
  });

  return NextResponse.json({ profile });
}
