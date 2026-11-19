"use client";

import { Send, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Field, ImageField, SectionCard, TextField, grid } from "@/app/admin/settings/fields";
import { readingMinutes, slugify } from "@/lib/journal/utils";
import type { BannedPhrase } from "@/lib/settings/schemas";
import { ClaimWarnings } from "@/ui/components/admin/claim-warnings";
import { Markdown } from "@/ui/components/markdown";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/ui/primitives/alert-dialog";
import { Button } from "@/ui/primitives/button";
import { Input } from "@/ui/primitives/input";
import { NativeSelect, NativeSelectOption } from "@/ui/primitives/native-select";
import { Textarea } from "@/ui/primitives/textarea";

import { deletePost, savePost } from "../actions";

export type PostValues = {
  title: string;
  slug: string;
  excerpt: string;
  coverUrl: string;
  body: string;
  seoTitle: string;
  seoDescription: string;
  status: "draft" | "published";
};

type Busy = "save" | "publish" | "delete" | null;

export function PostEditor({
  postId,
  initial,
  bannedPhrases,
}: {
  postId: string | null;
  initial: PostValues;
  bannedPhrases: BannedPhrase[];
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(initial);
  const [v, setV] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState<Busy>(null);
  const [, start] = useTransition();
  const dirty = JSON.stringify(saved) !== JSON.stringify(v);
  const set = <K extends keyof PostValues>(k: K, x: PostValues[K]) => setV((p) => ({ ...p, [k]: x }));

  const save = (status: PostValues["status"], kind: Busy) =>
    start(async () => {
      setBusy(kind);
      const next = { ...v, status };
      const res = await savePost(postId, next);
      setBusy(null);
      if (res.ok) {
        setV(next);
        setSaved(next);
        setErrors({});
        toast.success(status === "published" ? "Saved. Live on the site." : "Draft saved.");
        if (!postId) router.replace(`/admin/journal/${res.id}`);
        else router.refresh();
      } else {
        setErrors(res.fieldErrors ?? {});
        toast.error(res.error);
      }
    });

  const remove = () =>
    start(async () => {
      if (!postId) return;
      setBusy("delete");
      const res = await deletePost(postId);
      if (res.ok) {
        toast.success("Post deleted.");
        router.replace("/admin/journal");
      } else {
        setBusy(null);
        setConfirmDelete(false);
        toast.error(res.error);
      }
    });

  const working = busy !== null;

  return (
    <div className="space-y-6">
      <SectionCard title="Article" description="Title, summary and the article itself.">
        <div className="space-y-4">
          <TextField label="Title" value={v.title} onChange={(x) => set("title", x)} error={errors.title} bannedPhrases={bannedPhrases} />
          <TextField
            label="Excerpt"
            hint="Shown on cards and in search results. Max 300 characters."
            multiline
            value={v.excerpt}
            onChange={(x) => set("excerpt", x)}
            error={errors.excerpt}
            bannedPhrases={bannedPhrases}
          />
          <ImageField label="Cover image" value={v.coverUrl} onChange={(x) => set("coverUrl", x)} error={errors.coverUrl} />
          <Field
            label="Body"
            hint="Markdown: # Heading, **bold**, *italic*, [link](https://…), - list, > quote."
            error={errors.body}
          >
            <div className="flex items-center justify-between">
              <div className="inline-flex rounded-md border p-0.5">
                <Button type="button" size="sm" variant={preview ? "ghost" : "secondary"} onClick={() => setPreview(false)}>
                  Edit
                </Button>
                <Button type="button" size="sm" variant={preview ? "secondary" : "ghost"} onClick={() => setPreview(true)}>
                  Preview
                </Button>
              </div>
              <span className="text-xs text-muted-foreground">{readingMinutes(v.body)} min read</span>
            </div>
            {preview ? (
              <div className="min-h-[24rem] rounded-md border p-4">
                {v.body.trim() ? (
                  <Markdown source={v.body} className="space-y-4 leading-relaxed text-foreground/80" />
                ) : (
                  <p className="text-sm text-muted-foreground">Nothing to preview yet.</p>
                )}
              </div>
            ) : (
              <Textarea
                rows={20}
                className="font-mono text-sm"
                value={v.body}
                onChange={(e) => set("body", e.target.value)}
                aria-invalid={!!errors.body}
              />
            )}
            <ClaimWarnings text={v.body} bannedPhrases={bannedPhrases} />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="Publishing & SEO" description="URL, search snippet and visibility.">
        <div className={grid}>
          <Field
            label="URL slug"
            hint={`/journal/${v.slug || slugify(v.title) || "…"}`}
            error={errors.slug}
          >
            <Input
              value={v.slug}
              placeholder="auto from title"
              onChange={(e) => set("slug", e.target.value.toLowerCase())}
              aria-invalid={!!errors.slug}
            />
          </Field>
          <Field label="Status">
            <NativeSelect value={v.status} onChange={(e) => set("status", e.target.value as PostValues["status"])}>
              <NativeSelectOption value="draft">Draft</NativeSelectOption>
              <NativeSelectOption value="published">Published</NativeSelectOption>
            </NativeSelect>
          </Field>
          <TextField
            label="SEO title"
            hint="Max 70 characters. Defaults to the title."
            value={v.seoTitle}
            onChange={(x) => set("seoTitle", x)}
            error={errors.seoTitle}
          />
          <TextField
            label="SEO description"
            hint="Max 170 characters. Defaults to the excerpt."
            value={v.seoDescription}
            onChange={(x) => set("seoDescription", x)}
            error={errors.seoDescription}
          />
        </div>
      </SectionCard>

      <div className="sticky bottom-0 z-10 flex items-center justify-end gap-2 rounded-xl border bg-card/95 px-6 py-3 backdrop-blur">
        {postId && (
          <Button type="button" variant="outline" className="mr-auto text-destructive" disabled={working} onClick={() => setConfirmDelete(true)}>
            <Trash2 className="mr-2 h-4 w-4" /> Delete
          </Button>
        )}
        {dirty && <span className="text-sm text-muted-foreground">Unsaved changes</span>}
        {v.status === "draft" && (
          <Button type="button" variant="outline" loading={busy === "publish"} disabled={working} onClick={() => save("published", "publish")}>
            <Send className="mr-2 h-4 w-4" />
            {busy === "publish" ? "Publishing…" : "Save & publish"}
          </Button>
        )}
        <Button type="button" loading={busy === "save"} disabled={working || (!dirty && !!postId)} onClick={() => save(v.status, "save")}>
          {busy === "save" ? "Saving…" : "Save"}
        </Button>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={(o) => !working && setConfirmDelete(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this post?</AlertDialogTitle>
            <AlertDialogDescription>It will be removed from the site for good. This can&apos;t be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={working}>Cancel</AlertDialogCancel>
            <Button type="button" variant="destructive" loading={busy === "delete"} onClick={remove}>
              {busy === "delete" ? "Deleting…" : "Delete"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
