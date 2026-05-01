import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useIsDesktop } from "@/hooks/use-media-query";
import { Temporal, todayDate } from "@/lib/temporal";

const SUPPRESS_KEY = "delete-confirm-suppressed";

function isSuppressedToday(): boolean {
  try {
    const stored = localStorage.getItem(SUPPRESS_KEY);
    if (!stored) return false;
    return Temporal.PlainDate.compare(Temporal.PlainDate.from(stored), todayDate()) === 0;
  } catch {
    return false;
  }
}

function suppressForToday() {
  localStorage.setItem(SUPPRESS_KEY, todayDate().toString());
}

export function useDeleteConfirmation() {
  const [pending, setPending] = useState<{
    label: string;
    onConfirm: () => void;
  } | null>(null);

  function requestDelete(label: string, onConfirm: () => void) {
    if (isSuppressedToday()) {
      onConfirm();
      return;
    }
    setPending({ label, onConfirm });
  }

  function close() {
    setPending(null);
  }

  return { pending, requestDelete, close };
}

export function DeleteConfirmation({
  pending,
  onClose,
}: {
  onClose: () => void;
  pending: { label: string; onConfirm: () => void } | null;
}) {
  const isDesktop = useIsDesktop();
  const [suppress, setSuppress] = useState(false);

  function handleConfirm() {
    if (suppress) suppressForToday();
    pending?.onConfirm();
    onClose();
    setSuppress(false);
  }

  function handleCancel() {
    onClose();
    setSuppress(false);
  }

  const open = !!pending;

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={(v) => !v && handleCancel()}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Delete {pending?.label}?</DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Checkbox checked={suppress} onCheckedChange={(v) => setSuppress(!!v)} />
            Do not ask again today
          </label>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirm}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={(v) => !v && handleCancel()}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Delete {pending?.label}?</DrawerTitle>
          <DrawerDescription>This action cannot be undone.</DrawerDescription>
        </DrawerHeader>
        <div className="px-4 pb-2">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Checkbox checked={suppress} onCheckedChange={(v) => setSuppress(!!v)} />
            Do not ask again today
          </label>
        </div>
        <DrawerFooter>
          <Button variant="destructive" onClick={handleConfirm}>
            Delete
          </Button>
          <DrawerClose asChild>
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
