"use client"

import { Button } from "@/ui/primitives/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/ui/primitives/card";
import { Footer } from "@/ui/footer"
import { Navigation } from "@/ui/navigation"
import { Heart, LogOut, Package, Settings, User } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function AccountPage() {
  const router = useRouter()

  const handleLogout = () => {
    // In a real app, this would clear auth tokens
    router.push("/")
  }

  return (
    <div className="min-h-screen">
      <Navigation />

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-serif font-bold mb-8">My Account</h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Orders */}
            <Link href="/account/orders">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Package className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle>Orders</CardTitle>
                  </div>
                  <CardDescription>View your order history and track shipments</CardDescription>
                </CardHeader>
              </Card>
            </Link>

            {/* Profile */}
            <Link href="/account/profile">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle>Profile</CardTitle>
                  </div>
                  <CardDescription>Manage your personal information and addresses</CardDescription>
                </CardHeader>
              </Card>
            </Link>

            {/* Wishlist */}
            <Link href="/account/wishlist">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Heart className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle>Wishlist</CardTitle>
                  </div>
                  <CardDescription>Save your favorite teas for later</CardDescription>
                </CardHeader>
              </Card>
            </Link>

            {/* Settings */}
            <Link href="/account/settings">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Settings className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle>Settings</CardTitle>
                  </div>
                  <CardDescription>Update your preferences and password</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          </div>

          {/* Logout */}
          <Card className="mt-6">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold mb-1">Sign Out</h3>
                  <p className="text-sm text-muted-foreground">Log out of your account</p>
                </div>
                <Button variant="outline" onClick={handleLogout} className="bg-transparent">
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Footer />
    </div>
  )
}
