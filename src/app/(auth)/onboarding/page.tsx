import { ensureOnboardingIncomplete } from "@/data/onboarding/queries";
import { OnboardingClient } from "./onboarding-client";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const bootstrap = await ensureOnboardingIncomplete();
  return <OnboardingClient bootstrap={bootstrap} />;
}
