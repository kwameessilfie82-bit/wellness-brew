import { redirect } from "next/navigation";
import { db } from "@/db";
import { isAdmin } from "@/lib/admin-auth";
import { Card, CardContent } from "@/ui/primitives/card";
import { Button } from "@/ui/primitives/button";
import { ManagerAnalytics } from "@/ui/components/admin/manager-analytics";

export default async function AdminOverviewPage() {
  const adminUser = await isAdmin();
  if (!adminUser) {
    redirect("/auth/sign-in?redirect=/admin");
  }

  // Only managers can access the base /admin dashboard
  if (adminUser.role?.name === "admin") {
    redirect("/admin/inventory");
  }
  if (adminUser.role?.name !== "manager") {
    redirect("/auth/not-authorized");
  }

  // Fetch dashboard summary counts
  const [categories, inventoryItems] = await Promise.all([
    db.query.categoryTable.findMany(),
    db.query.inventoryTable.findMany(),
  ]);

  const stats = [
    { label: "Inventory Items", value: inventoryItems.length, href: "/admin/inventory" },
    { label: "Categories", value: categories.length, href: "/admin/categories" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Manager&apos;s Dashboard</h1>
          <p className="text-muted-foreground mt-1">Overview of your business management</p>
        </div>
      </div>

      {/* Stat Cards - Mobile Optimized */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {stats.map((s) => (
          <Card key={s.label} className="group hover:shadow-lg transition-all duration-300 border-border/50 hover:border-primary/30 bg-gradient-to-br from-background to-background/80">
            <CardContent className="p-4">
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="text-2xl sm:text-3xl font-bold text-primary group-hover:scale-110 transition-transform duration-300">
                  {s.value}
                </div>
                <div className="text-xs sm:text-sm font-medium text-muted-foreground leading-tight">
                  {s.label}
                </div>
                <Button asChild variant="outline" size="sm" className="w-full text-xs h-8 bg-background/50 hover:bg-primary/10 border-border/50 hover:border-primary/50 transition-all duration-300">
                  <a href={s.href}>Manage</a>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Analytics */}
      <ManagerAnalytics />
    </div>
  );
}
