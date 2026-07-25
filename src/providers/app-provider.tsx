"use client";

import * as React from "react";
import type { DashboardMode, SavingsPlanMode, User, UserId } from "@/types";
import { devPreviewUsers } from "@/lib/auth/dev-users";
import { createClient } from "@/lib/supabase/client";
import { emailToLegacyUserId, normalizeEmail } from "@/lib/auth/approved-users";
import type { Profile } from "@/lib/auth/types";
import { updateDashboardModeAction } from "@/data/profiles/mutations";

export type DateRangePreset =
  | "this_month"
  | "last_month"
  | "last_3_months"
  | "year_to_date"
  | "custom";

interface AppState {
  currentUser: User;
  /** Development-only mock switcher. No-op in production. */
  setCurrentUserId: (id: UserId) => void;
  isDevUserSwitcherEnabled: boolean;
  authEmail: string | null;
  profile: Profile | null;
  authReady: boolean;
  dashboardMode: DashboardMode;
  setDashboardMode: (mode: DashboardMode) => void;
  hideBalances: boolean;
  setHideBalances: (hide: boolean) => void;
  toggleHideBalances: () => void;
  dateRange: DateRangePreset;
  setDateRange: (range: DateRangePreset) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  savingsPlanMode: SavingsPlanMode;
  setSavingsPlanMode: (mode: SavingsPlanMode) => void;
  quickAddOpen: boolean;
  setQuickAddOpen: (open: boolean) => void;
  transferOpen: boolean;
  setTransferOpen: (open: boolean) => void;
  transferDefaults: { sourceAccountId?: string; destinationAccountId?: string } | null;
  openTransfer: (opts?: { sourceAccountId?: string; destinationAccountId?: string }) => void;
  reconcileOpen: boolean;
  setReconcileOpen: (open: boolean) => void;
  reconcileAccountId: string | null;
  openReconcile: (accountId: string) => void;
}

const AppContext = React.createContext<AppState | null>(null);

const STORAGE_KEY = "hisab-app-state";
const IS_DEV = process.env.NODE_ENV === "development";

interface PersistedState {
  currentUserId: UserId;
  dashboardMode: DashboardMode;
  hideBalances: boolean;
  dateRange: DateRangePreset;
  sidebarCollapsed: boolean;
  savingsPlanMode: SavingsPlanMode;
}

function readStored(): PersistedState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedState;
  } catch {
    return null;
  }
}

function writeStored(state: PersistedState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getInitial<T>(key: keyof PersistedState, fallback: T): T {
  const stored = readStored();
  if (!stored) return fallback;
  const value = stored[key];
  return (value as T | undefined) ?? fallback;
}

function profileToUser(profile: Profile): User {
  const legacyId = emailToLegacyUserId(profile.email);
  const mock = devPreviewUsers.find((u) => u.id === legacyId) ?? devPreviewUsers[0];
  return {
    ...mock,
    id: legacyId,
    name: profile.display_name || mock.name,
    email: normalizeEmail(profile.email),
  };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [devUserId, setDevUserId] = React.useState<UserId>(() =>
    getInitial("currentUserId", "arsalan" as UserId)
  );
  const [dashboardMode, setDashboardMode] = React.useState<DashboardMode>(() =>
    getInitial("dashboardMode", "combined" as DashboardMode)
  );
  const [hideBalances, setHideBalances] = React.useState(() =>
    getInitial("hideBalances", false)
  );
  const [dateRange, setDateRange] = React.useState<DateRangePreset>(() =>
    getInitial("dateRange", "this_month" as DateRangePreset)
  );
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(() =>
    getInitial("sidebarCollapsed", false)
  );
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [savingsPlanMode, setSavingsPlanMode] = React.useState<SavingsPlanMode>(() =>
    getInitial("savingsPlanMode", "balanced" as SavingsPlanMode)
  );
  const [quickAddOpen, setQuickAddOpen] = React.useState(false);
  const [transferOpen, setTransferOpenState] = React.useState(false);
  const [transferDefaults, setTransferDefaults] = React.useState<{
    sourceAccountId?: string;
    destinationAccountId?: string;
  } | null>(null);
  const [reconcileOpen, setReconcileOpen] = React.useState(false);
  const [reconcileAccountId, setReconcileAccountId] = React.useState<string | null>(
    null
  );
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [authEmail, setAuthEmail] = React.useState<string | null>(null);
  const [authReady, setAuthReady] = React.useState(false);
  const [devOverride, setDevOverride] = React.useState(false);

  const handleSetDashboardMode = React.useCallback(
    (mode: DashboardMode) => {
      setDashboardMode(mode);
      if (profile && !(IS_DEV && devOverride)) {
        void updateDashboardModeAction(mode).catch(() => {});
      }
    },
    [profile, devOverride]
  );

  React.useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function loadProfile(userId: string, email: string) {
      setAuthEmail(normalizeEmail(email));
      const { error: ensureError } = await supabase.rpc("ensure_profile_for_auth_user");
      if (ensureError && process.env.NODE_ENV === "development") {
        console.warn("[hisab] profile ensure:", ensureError.message);
      }
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();
      if (!cancelled) {
        setProfile(data);
        if (data) {
          setHideBalances(data.balances_hidden_by_default);
          setDashboardMode(data.default_dashboard_mode);
        }
      }
    }

    async function bootstrap() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user?.email && !cancelled) {
          await loadProfile(user.id, user.email);
        } else if (!cancelled) {
          setProfile(null);
          setAuthEmail(null);
        }
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          console.warn("[hisab] auth bootstrap:", error);
        }
      } finally {
        if (!cancelled) setAuthReady(true);
      }
    }

    void bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      const user = session?.user;
      if (user?.email) {
        void loadProfile(user.id, user.email);
      } else {
        setProfile(null);
        setAuthEmail(null);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  React.useEffect(() => {
    writeStored({
      currentUserId: devUserId,
      dashboardMode,
      hideBalances,
      dateRange,
      sidebarCollapsed,
      savingsPlanMode,
    });
  }, [
    devUserId,
    dashboardMode,
    hideBalances,
    dateRange,
    sidebarCollapsed,
    savingsPlanMode,
  ]);

  const sessionUser = profile
    ? profileToUser(profile)
    : authEmail
      ? {
          ...(devPreviewUsers.find((u) => u.id === emailToLegacyUserId(authEmail)) ?? {
            id: emailToLegacyUserId(authEmail),
            name: authEmail,
            email: authEmail,
            initials: "H",
            avatarColor: "#3730a3",
          }),
          email: authEmail,
          id: emailToLegacyUserId(authEmail),
        }
      : null;

  const currentUser =
    IS_DEV && devOverride
      ? (devPreviewUsers.find((u) => u.id === devUserId) ?? devPreviewUsers[0])
      : sessionUser ??
        (IS_DEV ? (devPreviewUsers.find((u) => u.id === devUserId) ?? devPreviewUsers[0]) : null);

  if (!currentUser) {
    return (
      <AppContext.Provider
        value={{
          currentUser: {
            id: "arsalan",
            name: "Loading",
            email: "",
            initials: "…",
            avatarColor: "#3730a3",
          },
          setCurrentUserId: () => {},
          isDevUserSwitcherEnabled: false,
          authEmail,
          profile,
          authReady,
          dashboardMode,
          setDashboardMode: handleSetDashboardMode,
          hideBalances,
          setHideBalances,
          toggleHideBalances: () => setHideBalances((h) => !h),
          dateRange,
          setDateRange,
          sidebarCollapsed,
          setSidebarCollapsed,
          toggleSidebar: () => setSidebarCollapsed((c) => !c),
          mobileMenuOpen,
          setMobileMenuOpen,
          savingsPlanMode,
          setSavingsPlanMode,
          quickAddOpen,
          setQuickAddOpen,
          transferOpen,
          setTransferOpen: setTransferOpenState,
          transferDefaults: null,
          openTransfer: (opts) => {
            setTransferDefaults(opts ?? null);
            setTransferOpenState(true);
          },
          reconcileOpen,
          setReconcileOpen,
          reconcileAccountId,
          openReconcile: () => {},
        }}
      >
        {children}
      </AppContext.Provider>
    );
  }

  const value: AppState = {
    currentUser,
    setCurrentUserId: (id) => {
      if (!IS_DEV) return;
      setDevOverride(true);
      setDevUserId(id);
    },
    isDevUserSwitcherEnabled: IS_DEV,
    authEmail,
    profile,
    authReady,
    dashboardMode,
    setDashboardMode: handleSetDashboardMode,
    hideBalances,
    setHideBalances,
    toggleHideBalances: () => setHideBalances((h) => !h),
    dateRange,
    setDateRange,
    sidebarCollapsed,
    setSidebarCollapsed,
    toggleSidebar: () => setSidebarCollapsed((c) => !c),
    mobileMenuOpen,
    setMobileMenuOpen,
    savingsPlanMode,
    setSavingsPlanMode,
    quickAddOpen,
    setQuickAddOpen,
    transferOpen,
    setTransferOpen: setTransferOpenState,
    transferDefaults,
    openTransfer: (opts) => {
      setTransferDefaults(opts ?? null);
      setTransferOpenState(true);
    },
    reconcileOpen,
    setReconcileOpen,
    reconcileAccountId,
    openReconcile: (accountId: string) => {
      setReconcileAccountId(accountId);
      setReconcileOpen(true);
    },
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = React.useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
