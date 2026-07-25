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
import { createUpworkOpportunityAction } from "@/data/business/mutations";
import {
  createUpworkOpportunitySchema,
  type CreateUpworkOpportunityInput,
} from "@/data/business/validation";

interface UpworkLogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UpworkLogDialog({ open, onOpenChange }: UpworkLogDialogProps) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  const form = useForm<CreateUpworkOpportunityInput>({
    defaultValues: {
      title: "",
      clientName: "",
      status: "sent",
      connectsSpent: 0,
      bidAmount: "",
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

  async function onSubmit(raw: CreateUpworkOpportunityInput) {
    setPending(true);
    setError(null);
    try {
      const values = createUpworkOpportunitySchema.parse(raw);
      await createUpworkOpportunityAction(values);
      onOpenChange(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to log proposal.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Log Upwork proposal</DialogTitle>
          <DialogDescription>Track a proposal, connects spent, and outcome.</DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="uw-title">Proposal title</Label>
            <Input id="uw-title" {...form.register("title")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="uw-client">Client name</Label>
            <Input id="uw-client" {...form.register("clientName")} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={form.watch("status")}
                onValueChange={(v) =>
                  form.setValue("status", v as CreateUpworkOpportunityInput["status"])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["sent", "responded", "interview", "offer", "won", "lost"] as const).map(
                    (status) => (
                      <SelectItem key={status} value={status} className="capitalize">
                        {status}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="uw-connects">Connects spent</Label>
              <Input
                id="uw-connects"
                type="number"
                min={0}
                {...form.register("connectsSpent", { valueAsNumber: true })}
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="uw-bid">Bid amount (USD, optional)</Label>
              <Input id="uw-bid" {...form.register("bidAmount")} className="tabular-nums" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="uw-revenue">Revenue won (PKR, optional)</Label>
              <Input id="uw-revenue" {...form.register("revenue")} className="tabular-nums" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="uw-date">Activity date</Label>
              <Input id="uw-date" type="date" {...form.register("activityDate")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="uw-followup">Follow-up date (optional)</Label>
              <Input id="uw-followup" type="date" {...form.register("followUpDate")} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="uw-notes">Notes (optional)</Label>
            <Textarea id="uw-notes" rows={2} {...form.register("notes")} />
          </div>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Log proposal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
