import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { formatGhanaPhone } from "@/lib/ghana";
import { getUserProfile, updateUserProfile } from "@/lib/queries/profile";

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

  const body = await request.json();

  const profile = await updateUserProfile(user.id, {
    name: body.name?.trim(),
    phone: body.phone != null ? formatGhanaPhone(String(body.phone)) : undefined,
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
