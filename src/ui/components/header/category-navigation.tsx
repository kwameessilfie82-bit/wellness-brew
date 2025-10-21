"use client";

import {
  Baby,
  Heart,
  Pill,
  Stethoscope,
  Syringe,
  Tablet,
  TestTube,
  Thermometer,
  Utensils,
  Shield,
  Eye,
  Brain,
  Activity,
} from "lucide-react";
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

const categories = [
  {
    title: "Prescriptions",
    href: "/products?category=prescriptions",
    description: "Prescription medications and controlled substances",
    icon: Syringe,
  },
  {
    title: "Medicines",
    href: "/products?category=medicines",
    description: "Over-the-counter medications and treatments",
    icon: Pill,
  },
  {
    title: "Vitamins",
    href: "/products?category=vitamins",
    description: "Essential vitamins and nutritional supplements",
    icon: Tablet,
  },
  {
    title: "Supplements",
    href: "/products?category=supplements",
    description: "Health supplements and wellness products",
    icon: TestTube,
  },
  {
    title: "Devices",
    href: "/products?category=devices",
    description: "Medical devices and health monitoring equipment",
    icon: Stethoscope,
  },
  {
    title: "Mother & Baby",
    href: "/products?category=mother & baby",
    description: "Prenatal care, baby products, and maternity essentials",
    icon: Baby,
  },
  {
    title: "Toiletries",
    href: "/products?category=toiletries",
    description: "Personal hygiene and care products",
    icon: Utensils,
  },
  {
    title: "Health",
    href: "/products?category=health",
    description: "General health products and first aid supplies",
    icon: Heart,
  },
  {
    title: "Wellness",
    href: "/products?category=wellness",
    description: "Wellness products and lifestyle health items",
    icon: Thermometer,
  },
  {
    title: "Personal Care",
    href: "/products?category=personal care",
    description: "Personal hygiene and grooming products",
    icon: Shield,
  },
  {
    title: "Eye Care",
    href: "/products?category=eye care",
    description: "Eye care products and vision health",
    icon: Eye,
  },
  {
    title: "Mental Health",
    href: "/products?category=mental health",
    description: "Mental wellness and cognitive health products",
    icon: Brain,
  },
  {
    title: "Fitness",
    href: "/products?category=fitness",
    description: "Fitness supplements and sports nutrition",
    icon: Activity,
  },
];

const ListItem = ({
  className,
  title,
  children,
  href,
  icon: Icon,
  ...props
}: {
  className?: string;
  title: string;
  children: React.ReactNode;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}) => {
  return (
    <li>
      <NavigationMenuLink asChild>
        <Link
          className={cn(
            "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
            className
          )}
          href={href}
          {...props}
        >
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-primary" />
            <div className="text-sm font-medium leading-none">{title}</div>
          </div>
          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
            {children}
          </p>
        </Link>
      </NavigationMenuLink>
    </li>
  );
};

export function CategoryNavigation() {
  return (
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger>Categories</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid w-[400px] gap-3 p-4 md:w-[600px] md:grid-cols-2 lg:w-[800px] lg:grid-cols-3">
              {categories.map((category) => (
                <ListItem
                  key={category.title}
                  title={category.title}
                  href={category.href}
                  icon={category.icon}
                >
                  {category.description}
                </ListItem>
              ))}
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}
