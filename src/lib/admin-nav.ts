/**
 * Admin destinations, shared by the sidebar, the route tracker and the
 * dashboard's quick access. Client-safe.
 */

export type AdminPermission =
  | "canViewAnalytics"
  | "canManageInventory"
  | "canManageCategories"
  | "canManageOrders"
  | "canManageCustomers"
  | "canManageSettings";

export type AdminDestination = {
  key: string;
  label: string;
  href: string;
  /** lucide icon name, resolved in the client component */
  icon: "orders" | "catalog" | "categories" | "customers" | "invoices" | "analytics" | "settings";
  permission: AdminPermission;
  description: string;
};

export const ADMIN_DESTINATIONS: AdminDestination[] = [
  { key: "orders", label: "Orders", href: "/admin/orders", icon: "orders", permission: "canManageOrders", description: "WhatsApp orders inbox" },
  { key: "inventory", label: "Catalog", href: "/admin/inventory", icon: "catalog", permission: "canManageInventory", description: "Products, prices & stock" },
  { key: "categories", label: "Categories", href: "/admin/categories", icon: "categories", permission: "canManageCategories", description: "Group your products" },
  { key: "analytics", label: "Analytics", href: "/admin/analytics", icon: "analytics", permission: "canViewAnalytics", description: "How the business is doing" },
  { key: "invoice-generator", label: "Invoices", href: "/admin/invoice-generator", icon: "invoices", permission: "canManageOrders", description: "Create & print invoices" },
  { key: "customers", label: "Customers", href: "/admin/customers", icon: "customers", permission: "canManageCustomers", description: "Users & staff roles" },
  { key: "settings", label: "Settings", href: "/admin/settings", icon: "settings", permission: "canManageSettings", description: "Business details & content" },
];

const SETTINGS_TAB_LABELS: Record<string, string> = {
  brand: "Brand",
  contact: "Contact",
  locations: "Locations",
  social: "Social",
  homepage: "Homepage",
  about: "About page",
  compliance: "Compliance",
  claims: "Claims & wording",
  payments: "Payments & invoices",
  ordering: "Ordering",
  delivery: "Delivery",
  whatsapp: "WhatsApp messages",
  history: "History",
};

export type VisitTarget = Omit<AdminDestination, "description"> & { description?: string };

/** Map a visited URL to something worth a quick-access tile (or null). */
export function resolveVisit(pathname: string, tab: string | null): VisitTarget | null {
  if (pathname === "/admin" || !pathname.startsWith("/admin/")) return null;
  const section = pathname.split("/")[2] ?? "";
  const dest = ADMIN_DESTINATIONS.find((d) => d.key === section);
  if (!dest) return null;
  if (dest.key === "settings" && tab && SETTINGS_TAB_LABELS[tab]) {
    return {
      ...dest,
      key: `settings:${tab}`,
      label: `Settings · ${SETTINGS_TAB_LABELS[tab]}`,
      href: `/admin/settings?tab=${tab}`,
      description: undefined,
    };
  }
  return dest;
}

export type VisitLog = Record<string, { target: VisitTarget; count: number; last: number }>;

export const visitStorageKey = (userId: string) => `wb-admin-visits:v1:${userId}`;

/** Frequently AND recently used first: visits decay over a couple of weeks. */
export function rankVisits(log: VisitLog, now = Date.now()) {
  return Object.values(log)
    .map((v) => ({ ...v, score: v.count / (1 + (now - v.last) / (7 * 86_400_000)) }))
    .sort((a, b) => b.score - a.score);
}
