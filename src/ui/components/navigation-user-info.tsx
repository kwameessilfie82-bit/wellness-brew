"use client";

import { useEffect, useState } from "react";

import { HeaderUserDropdown } from "@/ui/components/header/header-user";
import { Skeleton } from "@/ui/primitives/skeleton";
import { useCurrentUser } from "@/lib/auth-client";

interface UserInfo {
  email: string;
  name: string;
  image?: string | null;
  isAdmin: boolean;
  adminRole?: string | null;
}

export function NavigationUserInfo() {
  const { isPending, user } = useCurrentUser();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserInfo = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch("/api/admin/me");
        const data = await response.json();

        const isAdmin = Boolean(data.isAdmin);
        const roleName =
          data.role?.name ?? data.adminUser?.role?.name ?? null;

        setUserInfo({
          email: user.email || "",
          name: user.name || "",
          image: user.image,
          isAdmin,
          adminRole: isAdmin ? roleName : null,
        });
      } catch {
        setUserInfo({
          email: user.email || "",
          name: user.name || "",
          image: user.image,
          isAdmin: false,
          adminRole: null,
        });
      } finally {
        setLoading(false);
      }
    };

    if (!isPending && user) {
      void fetchUserInfo();
    } else if (!isPending && !user) {
      setLoading(false);
    }
  }, [isPending, user]);

  if (isPending || loading) {
    return <Skeleton className="h-9 w-9 rounded-full" />;
  }

  if (!user || !userInfo) {
    return null;
  }

  return (
    <HeaderUserDropdown
      isDashboard={false}
      userEmail={userInfo.email}
      userImage={userInfo.image}
      userName={userInfo.name}
      isAdmin={userInfo.isAdmin}
      adminRole={userInfo.adminRole || undefined}
    />
  );
}
