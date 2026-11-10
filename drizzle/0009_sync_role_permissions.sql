-- Re-sync the built-in role permissions with ADMIN_PERMISSIONS (src/lib/admin-auth.ts).
-- Idempotent: manager = everything, admin = operations only (no analytics/customers/settings/admins).
UPDATE admin_role
SET permissions = '{"canManageProducts":true,"canManageCategories":true,"canManageInventory":true,"canManageAdmins":true,"canViewAnalytics":true,"canManageOrders":true,"canManageCustomers":true,"canManageSettings":true}',
    updated_at = now()
WHERE name = 'manager';

UPDATE admin_role
SET permissions = '{"canManageProducts":true,"canManageCategories":true,"canManageInventory":true,"canManageAdmins":false,"canViewAnalytics":false,"canManageOrders":true,"canManageCustomers":false,"canManageSettings":false}',
    updated_at = now()
WHERE name = 'admin';
