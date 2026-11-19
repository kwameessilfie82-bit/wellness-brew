import { eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { db } from "@/db";
import { postTable } from "@/db/schema";
import { requirePagePermission } from "@/lib/admin-auth";
import { getSettings } from "@/lib/settings/get";
import { AdminPageHeader } from "@/ui/components/admin/admin-page-header";
import { Button } from "@/ui/primitives/button";

import { PostEditor, type PostValues } from "./post-editor";

export const dynamic = "force-dynamic";
export const metadata = { title: "Journal post" };

const EMPTY: PostValues = {
  title: "",
  slug: "",
  excerpt: "",
  coverUrl: "",
  body: "",
  seoTitle: "",
  seoDescription: "",
  status: "draft",
};

export default async function JournalPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requirePagePermission("canManageProducts", `/admin/journal/${id}`);
  const isNew = id === "new";
  const [[post], claims] = await Promise.all([
    isNew ? Promise.resolve([]) : db.select().from(postTable).where(eq(postTable.id, id)).limit(1),
    getSettings("claims"),
  ]);
  if (!isNew && !post) notFound();

  const initial: PostValues = post
    ? {
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt ?? "",
        coverUrl: post.coverUrl ?? "",
        body: post.body,
        seoTitle: post.seoTitle ?? "",
        seoDescription: post.seoDescription ?? "",
        status: post.status === "published" ? "published" : "draft",
      }
    : EMPTY;

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link href="/admin/journal">
          <ArrowLeft className="mr-1 h-4 w-4" /> Brew Journal
        </Link>
      </Button>
      <AdminPageHeader title={post ? post.title : "New post"} description="Write in Markdown. Nothing goes live until you publish.">
        {post && post.status === "published" && (
          <Button asChild variant="outline">
            <Link href={`/journal/${post.slug}`} target="_blank">
              View on site
            </Link>
          </Button>
        )}
      </AdminPageHeader>
      <PostEditor key={id} postId={post?.id ?? null} initial={initial} bannedPhrases={claims.bannedPhrases} />
    </div>
  );
}
