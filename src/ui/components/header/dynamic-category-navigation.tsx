"use client";

import { useEffect, useMemo, useState } from "react";
import { Baby, Heart, Pill, Stethoscope, Syringe, Tablet, TestTube, Utensils, Shield, Eye, Brain, Activity } from "lucide-react";
import Link from "next/link";

import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/ui/primitives/navigation-menu";
import { cn } from "@/lib/cn";
import { Input } from "@/ui/primitives/input";

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  productCount: number;
}

const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  prescriptions: Syringe,
  medicines: Pill,
  vitamins: Tablet,
  supplements: TestTube,
  devices: Stethoscope,
  "mother & baby": Baby,
  toiletries: Utensils,
  health: Heart,
  wellness: Activity,
  "personal care": Shield,
  "eye care": Eye,
  "mental health": Brain,
  fitness: Activity,
};

export function DynamicCategoryNavigation() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch("/api/categories");
        const data = await response.json();
        setCategories(data.categories || []);
      } catch (error) {
        console.error("Error fetching categories:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);
  const filteredCategories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) =>
      c.name.toLowerCase().includes(q) ||
      (c.description ? c.description.toLowerCase().includes(q) : false) ||
      c.slug.toLowerCase().includes(q)
    );
  }, [categories, searchQuery]);

  if (loading) {
    return (
      <NavigationMenu>
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuTrigger>Categories</NavigationMenuTrigger>
            <NavigationMenuContent>
              <div className="p-4">Loading categories...</div>
            </NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
    );
  }

  if (categories.length === 0) {
    return null;
  }

  return (
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger>Categories</NavigationMenuTrigger>
          <NavigationMenuContent>
            <div className="w-[420px] md:w-[560px] lg:w-[720px] p-0">
              {/* Sticky search */}
              <div className="sticky top-0 z-10 border-b bg-popover/80 backdrop-blur supports-[backdrop-filter]:bg-popover/60 p-3">
                <Input
                  placeholder="Search categories..."
                  className="h-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              {/* Scrollable list */}
              <div className="max-h-[70vh] overflow-y-auto">
                <div className="grid gap-3 p-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredCategories.map((category) => {
                const IconComponent = categoryIcons[category.slug] || Pill;
                return (
                  <NavigationMenuLink key={category.id} asChild>
                    <Link
                      href={`/products?category=${category.slug}`}
                      className={cn(
                        "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                      )}
                    >
                      <div className="flex items-center space-x-2">
                        <IconComponent className="h-4 w-4" />
                        <div className="text-sm font-medium leading-none">
                          {category.name}
                        </div>
                      </div>
                      <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                        {category.description || `${category.productCount} products available`}
                      </p>
                    </Link>
                  </NavigationMenuLink>
                );
                  })}
                </div>
              </div>
              {/* Footer link */}
              <div className="border-t p-3 text-right">
                <Link href="/products" className="text-sm font-medium text-primary hover:underline">
                  View all categories
                </Link>
              </div>
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}
