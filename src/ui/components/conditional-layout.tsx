"use client";

import { usePathname } from "next/navigation";
import { Header } from "@/ui/components/header/header";
import { Footer } from "@/ui/components/footer";

interface ConditionalLayoutProps {
  children: React.ReactNode;
}

export function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const pathname = usePathname();
  const isAdminRoute = pathname.startsWith("/admin");

  return (
    <>
      {!isAdminRoute && <Header showAuth={true} />}
      <main className={`flex min-h-screen flex-col`}>{children}</main>
      {!isAdminRoute && <Footer />}
    </>
  );
}
