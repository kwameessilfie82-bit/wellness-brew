import { count, desc } from "drizzle-orm";
import { Plus } from "lucide-react";
import Link from "next/link";

import { db } from "@/db";
import { postTable } from "@/db/schema";
import { requirePagePermission } from "@/lib/admin-auth";
import { formatPostDate } from "@/lib/journal/utils";
import { AdminPageHeader } from "@/ui/components/admin/admin-page-header";
import { Badge } from "@/ui/primitives/badge";
import { Button } from "@/ui/primitives/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui/primitives/table";

export const dynamic = "force-dynamic";
export const metadata = { title: "Brew Journal" };

const PAGE_SIZE = 30;

export default async function AdminJournalPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requirePagePermission("canManageProducts", "/admin/journal");
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const [posts, [totalRow]] = await Promise.all([
    db
      .select({
        id: postTable.id,
        title: postTable.title,
        slug: postTable.slug,
        status: postTable.status,
        publishedAt: postTable.publishedAt,
        updatedAt: postTable.updatedAt,
      })
      .from(postTable)
      .orderBy(desc(postTable.updatedAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ n: count() }).from(postTable),
  ]);
  const pages = Math.max(1, Math.ceil((totalRow?.n ?? 0) / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Brew Journal" description="Articles that bring tea lovers (and Google) to the shop.">
        <Button asChild>
          <Link href="/admin/journal/new">
            <Plus className="mr-1 h-4 w-4" /> New post
          </Link>
        </Button>
      </AdminPageHeader>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Published</TableHead>
              <TableHead>Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {posts.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                  No posts yet.
                </TableCell>
              </TableRow>
            )}
            {posts.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <Link href={`/admin/journal/${p.id}`} className="font-medium hover:underline">
                    {p.title}
                  </Link>
                  <p className="text-xs text-muted-foreground">/journal/{p.slug}</p>
                </TableCell>
                <TableCell>
                  <Badge variant={p.status === "published" ? "default" : "secondary"}>
                    {p.status === "published" ? "Published" : "Draft"}
                  </Badge>
                </TableCell>
                <TableCell>{formatPostDate(p.publishedAt) || "—"}</TableCell>
                <TableCell>{formatPostDate(p.updatedAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <Button asChild variant="outline" size="sm">
            <Link href={`/admin/journal?page=${page - 1}`} aria-disabled={page <= 1} className={page <= 1 ? "pointer-events-none opacity-50" : ""}>
              Previous
            </Link>
          </Button>
          <span className="text-muted-foreground">
            Page {page} of {pages}
          </span>
          <Button asChild variant="outline" size="sm">
            <Link href={`/admin/journal?page=${page + 1}`} aria-disabled={page >= pages} className={page >= pages ? "pointer-events-none opacity-50" : ""}>
              Next
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
