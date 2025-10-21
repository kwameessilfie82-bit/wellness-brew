import { getCurrentUserOrRedirect } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/primitives/card";
import { Button } from "@/ui/primitives/button";
import Link from "next/link";
import { Upload, CreditCard, Settings, User } from "lucide-react";

export default async function DashboardPage() {
  const user = await getCurrentUserOrRedirect();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Welcome back, {user?.name || 'User'}!</h1>
        <p className="text-muted-foreground">Manage your account and explore our services.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uploads</CardTitle>
            <Upload className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Manage Files</div>
            <p className="text-xs text-muted-foreground">
              Upload and manage your media files
            </p>
            <Button asChild className="mt-2" size="sm">
              <Link href="/dashboard/uploads">Go to Uploads</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Billing</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Payment</div>
            <p className="text-xs text-muted-foreground">
              Manage your billing and payments
            </p>
            <Button asChild className="mt-2" size="sm">
              <Link href="/dashboard/billing">Go to Billing</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profile</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Account</div>
            <p className="text-xs text-muted-foreground">
              Update your profile information
            </p>
            <Button asChild className="mt-2" size="sm">
              <Link href="/dashboard/profile">Go to Profile</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Settings</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Preferences</div>
            <p className="text-xs text-muted-foreground">
              Configure your account settings
            </p>
            <Button asChild className="mt-2" size="sm">
              <Link href="/dashboard/settings">Go to Settings</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common tasks you might want to perform
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <Button asChild variant="outline">
              <Link href="/products">Browse Products</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard/uploads">Upload Media</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard/billing">View Billing</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard/profile">Edit Profile</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
