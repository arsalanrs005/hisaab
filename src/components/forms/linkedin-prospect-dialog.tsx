"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createLinkedInProspectAction } from "@/data/business/mutations";
import {
  createLinkedInProspectSchema,
  type CreateLinkedInProspectInput,
} from "@/data/business/validation";

interface LinkedInProspectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LinkedInProspectDialog({ open, onOpenChange }: LinkedInProspectDialogProps) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  const form = useForm<CreateLinkedInProspectInput>({
    defaultValues: {
      prospectName: "",
      company: "",
      title: "",
      status: "researched",
      activityDate: new Date().toISOString().slice(0, 10),
      followUpDate: "",
      revenue: "",
      notes: "",
    },
  });

  React.useEffect(() => {
    if (!open) {
      form.reset();
      setError(null);
    }
  }, [open, form]);

  async function onSubmit(raw: CreateLinkedInProspectInput) {
    setPending(true);
    setError(null);
    try {
      const values = createLinkedInProspectSchema.parse(raw);
      await createLinkedInProspectAction(values);
      onOpenChange(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to add prospect.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add LinkedIn prospect</DialogTitle>
          <DialogDescription>Log outreach activity and follow-up dates.</DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="li-name">Prospect name</Label>
            <Input id="li-name" {...form.register("prospectName")} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="li-company">Company</Label>
              <Input id="li-company" {...form.register("company")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="li-title">Title / role</Label>
              <Input id="li-title" {...form.register("title")} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select
              value={form.watch("status")}
              onValueChange={(v) =>
                form.setValue("status", v as CreateLinkedInProspectInput["status"])
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(
                  [
                    "researched",
                    "identified",
                    "requested",
                    "accepted",
                    "conversation",
                    "call",
                    "proposal",
                    "won",
                    "lost",
                  ] as const
                ).map((status) => (
                  <SelectItem key={status} value={status} className="capitalize">
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="li-date">Activity date</Label>
              <Input id="li-date" type="date" {...form.register("activityDate")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="li-followup">Follow-up date (optional)</Label>
              <Input id="li-followup" type="date" {...form.register("followUpDate")} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="li-revenue">Revenue (PKR, optional)</Label>
            <Input id="li-revenue" {...form.register("revenue")} className="tabular-nums" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="li-notes">Notes (optional)</Label>
            <Textarea id="li-notes" rows={2} {...form.register("notes")} />
          </div>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Add prospect"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
