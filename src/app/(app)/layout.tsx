import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { AppProvider } from "@/providers/app-provider";
import { getCurrentProfile } from "@/data/profiles/queries";
import { getUnreadNotificationCount } from "@/data/notifications/queries";
import { getCurrentWorkspace } from "@/data/workspaces/queries";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  if (profile && !profile.onboarding_completed) {
    redirect("/onboarding");
  }

  const [unreadNotificationCount, workspace] = await Promise.all([
    profile ? getUnreadNotificationCount().catch(() => 0) : Promise.resolve(0),
    profile ? getCurrentWorkspace().catch(() => null) : Promise.resolve(null),
  ]);

  return (
    <AppProvider>
      <AppShell
        initialUnreadNotificationCount={unreadNotificationCount}
        initialWorkspace={workspace}
      >
        {children}
      </AppShell>
    </AppProvider>
  );
}
