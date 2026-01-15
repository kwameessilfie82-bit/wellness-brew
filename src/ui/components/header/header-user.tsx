import {
  LogOut,
  Moon,
  Shield,
  Sun,
  UserIcon,
} from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import * as React from "react";

import { cn } from "@/lib/cn";
import { Avatar, AvatarFallback, AvatarImage } from "@/ui/primitives/avatar";
import { Badge } from "@/ui/primitives/badge";
import { Button } from "@/ui/primitives/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/ui/primitives/dropdown-menu";

interface HeaderUserDropdownProps {
  isDashboard: boolean;
  userEmail: string;
  userImage?: null | string;
  userName: string;
  adminRole?: string;
}

export function HeaderUserDropdown({
  isDashboard = false,
  userEmail,
  userImage,
  userName,
  adminRole,
}: HeaderUserDropdownProps) {
  const { setTheme, theme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // Avoid hydration mismatch by rendering only on client-side
  React.useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
  }, []);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          className="relative overflow-hidden rounded-full"
          size="icon"
          variant="ghost"
        >
          <Avatar className="h-9 w-9">
            <AvatarImage
              alt={userName || "User"}
              src={userImage || undefined}
            />
            <AvatarFallback>
              {userName ? (
                userName
                  .split(" ")
                  .map((n: string) => n[0])
                  .join("")
                  .slice(0, 2)
              ) : (
                <UserIcon className="h-4 w-4" />
              )}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="flex items-center justify-start gap-2 p-2">
          <Avatar className="h-8 w-8 bg-primary/10">
            <AvatarImage
              alt={userName || "User"}
              src={userImage || undefined}
            />
            <AvatarFallback>
              {userName ? (
                userName
                  .split(" ")
                  .map((n: string) => n[0])
                  .join("")
                  .slice(0, 2)
              ) : (
                <UserIcon className="h-4 w-4 text-primary" />
              )}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col space-y-0.5">
            <p className="text-sm font-medium">{userName || "User"}</p>
            <p
              className={"max-w-[160px] truncate text-xs text-muted-foreground"}
            >
              {userEmail}
            </p>
            {adminRole && (
              <Badge variant="secondary" className="w-fit text-xs">
                {adminRole === 'super_admin' ? 'Manager' : 
                 adminRole === 'admin' ? 'Admin' : 
                 adminRole.replace('_', ' ').toUpperCase()}
              </Badge>
            )}
          </div>
        </div>
        <DropdownMenuSeparator />
        
        {/* Always show Profile */}
        <DropdownMenuItem asChild>
          <Link className="cursor-pointer" href="/dashboard/profile">
            <UserIcon className="mr-2 h-4 w-4" />
            Profile
          </Link>
        </DropdownMenuItem>
        
        {/* Show dashboard link based on role */}
        {adminRole && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link className="cursor-pointer" href="/admin/inventory">
                <Shield className="mr-2 h-4 w-4" />
                Dashboard
              </Link>
            </DropdownMenuItem>
            {adminRole === 'manager' && (
              <DropdownMenuItem asChild>
                <Link className="cursor-pointer" href="/admin">
                  <Shield className="mr-2 h-4 w-4" />
                  Manager Dashboard
                </Link>
              </DropdownMenuItem>
            )}
          </>
        )}
        
        {/* Theme Toggle Section */}
        {mounted && (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
              Theme
            </div>
            <DropdownMenuItem
              className={cn(
                "flex cursor-pointer items-center gap-2",
                theme === "light" && "font-medium text-primary",
              )}
              onClick={() => setTheme("light")}
            >
              <Sun className="h-4 w-4" />
              Light
            </DropdownMenuItem>
            <DropdownMenuItem
              className={cn(
                "flex cursor-pointer items-center gap-2",
                theme === "dark" && "font-medium text-primary",
              )}
              onClick={() => setTheme("dark")}
            >
              <Moon className="h-4 w-4" />
              Dark
            </DropdownMenuItem>
            <DropdownMenuItem
              className={cn(
                "flex cursor-pointer items-center gap-2",
                (theme === "system" || !theme) && "font-medium text-primary",
              )}
              onClick={() => setTheme("system")}
            >
              <svg
                aria-hidden="true"
                className="h-4 w-4"
                fill="currentColor"
                role="img"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <title>System Theme Icon</title>
                <path
                  clipRule="evenodd"
                  d="M3.5 2A1.5 1.5 0 002 3.5V15a3 3 0 003 3h12a1.5 1.5 0 001.5-1.5V3.5A1.5 1.5 0 0017 2H3.5zM5 5.75c0-.41.334-.75.75-.75h8.5a.75.75 0 010 1.5h-8.5a.75.75 0 01-.75-.75zM5.75 8.25a.75.75 0 00-.75.75v3.25c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75V9a.75.75 0 00-.75-.75h-8.5z"
                  fillRule="evenodd"
                />
              </svg>
              System
            </DropdownMenuItem>
          </>
        )}
        
        <DropdownMenuSeparator />
        <DropdownMenuItem
          asChild
          className={cn(
            "cursor-pointer",
            isDashboard
              ? "text-red-600"
              : `
                txt-destructive
                focus:text-destrctive
              `,
          )}
        >
          <Link href="/auth/sign-out">
            <LogOut className="mr-2 h-4 w-4" />
            Log out
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
