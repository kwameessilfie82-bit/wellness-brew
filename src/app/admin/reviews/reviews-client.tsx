"use client";

import { Check, Star, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import type { ActionResult } from "@/lib/activity";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/ui/primitives/alert-dialog";
import { Button } from "@/ui/primitives/button";

import { deleteReview, moderateReview, setReviewFeatured } from "./actions";

type Busy = "approve" | "reject" | "pending" | "feature" | "delete" | null;

export function ReviewActions({
  id,
  status,
  isFeatured,
}: {
  id: string;
  status: "pending" | "approved" | "rejected";
  isFeatured: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<Busy>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const run = async (key: Exclude<Busy, null>, fn: () => Promise<ActionResult>, success: string) => {
    setBusy(key);
    try {
      const res = await fn();
      if (res.ok) {
        toast.success(success);
        setConfirmOpen(false);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    } finally {
      setBusy(null);
    }
  };
  const disabled = busy !== null;

  return (
    <div className="flex flex-wrap gap-2">
      {status !== "approved" ? (
        <Button
          size="sm"
          loading={busy === "approve"}
          disabled={disabled}
          onClick={() => run("approve", () => moderateReview(id, "approved"), "Review approved and live.")}
        >
          <Check className="mr-1 h-4 w-4" /> Approve
        </Button>
      ) : null}
      {status !== "rejected" ? (
        <Button
          size="sm"
          variant="outline"
          loading={busy === "reject"}
          disabled={disabled}
          onClick={() => run("reject", () => moderateReview(id, "rejected"), "Review rejected.")}
        >
          <X className="mr-1 h-4 w-4" /> Reject
        </Button>
      ) : null}
      {status !== "pending" ? (
        <Button
          size="sm"
          variant="ghost"
          loading={busy === "pending"}
          disabled={disabled}
          onClick={() => run("pending", () => moderateReview(id, "pending"), "Moved back to pending.")}
        >
          Move to pending
        </Button>
      ) : null}
      {status === "approved" ? (
        <Button
          size="sm"
          variant={isFeatured ? "secondary" : "outline"}
          loading={busy === "feature"}
          disabled={disabled}
          onClick={() =>
            run(
              "feature",
              () => setReviewFeatured(id, !isFeatured),
              isFeatured ? "Removed from featured." : "Featured on the homepage.",
            )
          }
        >
          <Star className="mr-1 h-4 w-4" /> {isFeatured ? "Unfeature" : "Feature"}
        </Button>
      ) : null}
      <Button size="sm" variant="ghost" disabled={disabled} onClick={() => setConfirmOpen(true)}>
        <Trash2 className="mr-1 h-4 w-4" /> Delete
      </Button>
      <AlertDialog open={confirmOpen} onOpenChange={(o) => (busy === "delete" ? undefined : setConfirmOpen(o))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this review?</AlertDialogTitle>
            <AlertDialogDescription>This permanently removes the review. It cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy === "delete"}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void run("delete", () => deleteReview(id), "Review deleted.");
              }}
            >
              {busy === "delete" ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
