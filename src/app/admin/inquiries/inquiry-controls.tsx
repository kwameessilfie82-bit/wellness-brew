"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

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
import { NativeSelect, NativeSelectOption } from "@/ui/primitives/native-select";
import { Textarea } from "@/ui/primitives/textarea";

import { deleteInquiry, updateInquiry } from "./actions";

const STATUSES = ["new", "contacted", "quoted", "won", "lost"] as const;

export function InquiryControls({
  id,
  status,
  staffNotes,
}: {
  id: string;
  status: string;
  staffNotes: string | null;
}) {
  const router = useRouter();
  const [value, setValue] = useState(status);
  const [notes, setNotes] = useState(staffNotes ?? "");
  const [savedNotes, setSavedNotes] = useState(staffNotes ?? "");
  const [busy, setBusy] = useState<"status" | "notes" | "delete" | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const changeStatus = async (next: string) => {
    const prev = value;
    setValue(next);
    setBusy("status");
    try {
      const res = await updateInquiry(id, { status: next });
      if (res.ok) {
        toast.success(`Marked ${next}.`);
        router.refresh();
      } else {
        setValue(prev);
        toast.error(res.error);
      }
    } finally {
      setBusy(null);
    }
  };

  const saveNotes = async () => {
    setBusy("notes");
    try {
      const res = await updateInquiry(id, { staffNotes: notes });
      if (res.ok) {
        setSavedNotes(notes.trim());
        toast.success("Notes saved.");
      } else {
        toast.error(res.fieldErrors?.staffNotes ?? res.error);
      }
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    setBusy("delete");
    try {
      const res = await deleteInquiry(id);
      if (res.ok) {
        toast.success("Inquiry deleted.");
        setConfirmOpen(false);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <NativeSelect
          size="sm"
          aria-label="Inquiry status"
          value={value}
          disabled={busy !== null}
          onChange={(e) => void changeStatus(e.target.value)}
        >
          {STATUSES.map((s) => (
            <NativeSelectOption key={s} value={s}>
              {s[0].toUpperCase() + s.slice(1)}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        {busy === "status" ? <span className="text-xs text-muted-foreground">Saving…</span> : null}
        <Button size="sm" variant="ghost" disabled={busy !== null} onClick={() => setConfirmOpen(true)}>
          <Trash2 className="mr-1 h-4 w-4" /> Delete
        </Button>
      </div>
      <div className="space-y-2">
        <Textarea
          rows={2}
          maxLength={2000}
          placeholder="Staff notes (private)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <Button
          size="sm"
          variant="outline"
          loading={busy === "notes"}
          disabled={busy !== null || notes.trim() === savedNotes}
          onClick={() => void saveNotes()}
        >
          Save notes
        </Button>
      </div>
      <AlertDialog open={confirmOpen} onOpenChange={(o) => (busy === "delete" ? undefined : setConfirmOpen(o))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this inquiry?</AlertDialogTitle>
            <AlertDialogDescription>This permanently removes the inquiry. It cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy === "delete"}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void remove();
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
