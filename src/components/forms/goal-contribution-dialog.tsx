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
import { addGoalContributionAction } from "@/data/goals/mutations";
import {
  addGoalContributionSchema,
  type AddGoalContributionInput,
} from "@/data/goals/validation";
import type { AccountWithMeta } from "@/data/accounts/mappers";

interface GoalContributionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goalId: string;
  goalName: string;
  accounts: AccountWithMeta[];
}

export function GoalContributionDialog({
  open,
  onOpenChange,
  goalId,
  goalName,
  accounts,
}: GoalContributionDialogProps) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  const form = useForm<AddGoalContributionInput>({
    defaultValues: {
      goalId,
      amount: "",
      accountId: undefined,
      contributionDate: new Date().toISOString().slice(0, 10),
      notes: "",
      contributionType: "deposit",
    },
  });

  React.useEffect(() => {
    if (open) {
      form.reset({
        goalId,
        amount: "",
        accountId: undefined,
        contributionDate: new Date().toISOString().slice(0, 10),
        notes: "",
        contributionType: "deposit",
      });
      setError(null);
    }
  }, [open, goalId, form]);

  async function onSubmit(raw: AddGoalContributionInput) {
    setPending(true);
    setError(null);
    try {
      const values = addGoalContributionSchema.parse({ ...raw, goalId });
      await addGoalContributionAction(values);
      onOpenChange(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to record contribution.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add contribution</DialogTitle>
          <DialogDescription>Record a deposit toward {goalName}.</DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="contrib-amount">Amount (PKR)</Label>
            <Input id="contrib-amount" {...form.register("amount")} className="tabular-nums" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contrib-date">Date</Label>
            <Input id="contrib-date" type="date" {...form.register("contributionDate")} />
          </div>
          <div className="space-y-1.5">
            <Label>Funding account (optional)</Label>
            <Select
              value={form.watch("accountId") ?? "none"}
              onValueChange={(v) =>
                form.setValue("accountId", v === "none" ? undefined : v)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contrib-notes">Notes (optional)</Label>
            <Textarea id="contrib-notes" rows={2} {...form.register("notes")} />
          </div>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save contribution"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
