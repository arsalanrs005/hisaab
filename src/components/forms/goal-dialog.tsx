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
import { createGoalAction } from "@/data/goals/mutations";
import { createGoalSchema, type CreateGoalInput } from "@/data/goals/validation";
import type { AccountWithMeta } from "@/data/accounts/mappers";

interface GoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: AccountWithMeta[];
}

export function GoalDialog({ open, onOpenChange, accounts }: GoalDialogProps) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  const form = useForm<CreateGoalInput>({
    defaultValues: {
      name: "",
      targetAmount: "",
      monthlyTarget: "",
      ownershipType: "shared",
      priority: "medium",
      targetDate: "",
      fundingAccountId: undefined,
      description: "",
    },
  });

  React.useEffect(() => {
    if (!open) {
      form.reset();
      setError(null);
    }
  }, [open, form]);

  async function onSubmit(raw: CreateGoalInput) {
    setPending(true);
    setError(null);
    try {
      const values = createGoalSchema.parse(raw);
      const result = await createGoalAction(values);
      onOpenChange(false);
      router.push(`/goals/${result.goalId}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to create goal.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add goal</DialogTitle>
          <DialogDescription>
            Create a personal, shared, or business savings target with an optional monthly plan.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="goal-name">Name</Label>
            <Input id="goal-name" {...form.register("name")} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="goal-target">Target amount (PKR)</Label>
              <Input id="goal-target" {...form.register("targetAmount")} className="tabular-nums" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="goal-monthly">Monthly target (optional)</Label>
              <Input id="goal-monthly" {...form.register("monthlyTarget")} className="tabular-nums" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Ownership</Label>
              <Select
                value={form.watch("ownershipType")}
                onValueChange={(v) =>
                  form.setValue("ownershipType", v as CreateGoalInput["ownershipType"])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="personal">Personal</SelectItem>
                  <SelectItem value="shared">Shared</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select
                value={form.watch("priority")}
                onValueChange={(v) => form.setValue("priority", v as CreateGoalInput["priority"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="goal-date">Target date (optional)</Label>
              <Input id="goal-date" type="date" {...form.register("targetDate")} />
            </div>
            <div className="space-y-1.5">
              <Label>Funding account (optional)</Label>
              <Select
                value={form.watch("fundingAccountId") ?? "none"}
                onValueChange={(v) =>
                  form.setValue("fundingAccountId", v === "none" ? undefined : v)
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
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="goal-notes">Description (optional)</Label>
            <Textarea id="goal-notes" rows={2} {...form.register("description")} />
          </div>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Creating…" : "Create goal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
