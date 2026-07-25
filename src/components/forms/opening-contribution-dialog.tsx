"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { allocateOpeningContributionsAction } from "@/data/transfers/mutations";
import type { ProfileSummary } from "@/data/profiles/helpers";
import { formatPKR } from "@/lib/format";

const schema = z.object({
  arsalanAmount: z.string().min(1, "Required"),
  aliAmount: z.string().min(1, "Required"),
});

type FormValues = z.infer<typeof schema>;

interface OpeningContributionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: string;
  openingBalance: number;
  profiles: ProfileSummary[];
}

export function OpeningContributionDialog({
  open,
  onOpenChange,
  accountId,
  openingBalance,
  profiles,
}: OpeningContributionDialogProps) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  const arsalan = profiles.find((p) => p.email.includes("arsalan"));
  const ali = profiles.find((p) => p.email.includes("ali"));

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { arsalanAmount: "", aliAmount: "" },
  });

  const arsalanAmount = Number(form.watch("arsalanAmount") || 0);
  const aliAmount = Number(form.watch("aliAmount") || 0);
  const allocated = (Number.isFinite(arsalanAmount) ? arsalanAmount : 0) + (Number.isFinite(aliAmount) ? aliAmount : 0);
  const unallocated = openingBalance - allocated;

  async function onSubmit(values: FormValues) {
    if (!arsalan || !ali) {
      setError("Unable to resolve contributor profiles.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      await allocateOpeningContributionsAction({
        accountId,
        allocations: [
          { contributorProfileId: arsalan.id, amountPkr: values.arsalanAmount },
          { contributorProfileId: ali.id, amountPkr: values.aliAmount },
        ],
      });
      onOpenChange(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save opening allocation.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Allocate opening balance</DialogTitle>
          <DialogDescription>
            Split the existing opening balance between contributors. This creates append-only
            contribution records — no bank transactions.
          </DialogDescription>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Opening balance: {formatPKR(openingBalance)} · Unallocated after save:{" "}
          {formatPKR(Math.max(unallocated, 0))}
        </p>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="arsalanAmount">{arsalan?.display_name ?? "Arsalan"} allocation (PKR)</Label>
            <Input id="arsalanAmount" inputMode="decimal" {...form.register("arsalanAmount")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="aliAmount">{ali?.display_name ?? "Ali"} allocation (PKR)</Label>
            <Input id="aliAmount" inputMode="decimal" {...form.register("aliAmount")} />
          </div>

          {unallocated < 0 ? (
            <p className="text-sm text-destructive" role="alert">
              Total allocated cannot exceed the opening balance.
            </p>
          ) : null}
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || unallocated < 0}>
              {pending ? "Saving…" : "Save allocation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
