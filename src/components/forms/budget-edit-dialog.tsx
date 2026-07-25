"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
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
import { updateBudgetAssumptionsAction } from "@/data/budgets/mutations";

interface BudgetAssumptions {
  comfortableSavingsRate: number;
  balancedSavingsRate: number;
  aggressiveSavingsRate: number;
  budgetWarningThreshold: number;
  budgetExceededThreshold: number;
}

interface BudgetEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assumptions: BudgetAssumptions;
}

export function BudgetEditDialog({ open, onOpenChange, assumptions }: BudgetEditDialogProps) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const [values, setValues] = React.useState({
    comfortableSavingsRate: String(Math.round(assumptions.comfortableSavingsRate * 100)),
    balancedSavingsRate: String(Math.round(assumptions.balancedSavingsRate * 100)),
    aggressiveSavingsRate: String(Math.round(assumptions.aggressiveSavingsRate * 100)),
    budgetWarningThreshold: String(Math.round(assumptions.budgetWarningThreshold * 100)),
    budgetExceededThreshold: String(Math.round(assumptions.budgetExceededThreshold * 100)),
  });

  React.useEffect(() => {
    if (open) {
      setValues({
        comfortableSavingsRate: String(Math.round(assumptions.comfortableSavingsRate * 100)),
        balancedSavingsRate: String(Math.round(assumptions.balancedSavingsRate * 100)),
        aggressiveSavingsRate: String(Math.round(assumptions.aggressiveSavingsRate * 100)),
        budgetWarningThreshold: String(Math.round(assumptions.budgetWarningThreshold * 100)),
        budgetExceededThreshold: String(Math.round(assumptions.budgetExceededThreshold * 100)),
      });
      setError(null);
    }
  }, [open, assumptions]);

  async function handleSave() {
    setPending(true);
    setError(null);
    try {
      await updateBudgetAssumptionsAction({
        comfortableSavingsRate: Number(values.comfortableSavingsRate) / 100,
        balancedSavingsRate: Number(values.balancedSavingsRate) / 100,
        aggressiveSavingsRate: Number(values.aggressiveSavingsRate) / 100,
        budgetWarningThreshold: Number(values.budgetWarningThreshold) / 100,
        budgetExceededThreshold: Number(values.budgetExceededThreshold) / 100,
      });
      onOpenChange(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save assumptions.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit budget assumptions</DialogTitle>
          <DialogDescription>
            Savings plan rates and budget warning thresholds for this workspace.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {(
            [
              ["comfortableSavingsRate", "Comfortable savings rate (%)"],
              ["balancedSavingsRate", "Balanced savings rate (%)"],
              ["aggressiveSavingsRate", "Aggressive savings rate (%)"],
              ["budgetWarningThreshold", "Budget warning threshold (%)"],
              ["budgetExceededThreshold", "Budget exceeded threshold (%)"],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="space-y-1.5">
              <Label htmlFor={key}>{label}</Label>
              <Input
                id={key}
                value={values[key]}
                onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
                className="tabular-nums"
              />
            </div>
          ))}
        </div>

        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void handleSave()} disabled={pending}>
            {pending ? "Saving…" : "Save assumptions"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
