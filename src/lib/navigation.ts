import {
  ArrowLeftRight,
  Bell,
  Briefcase,
  CreditCard,
  FileText,
  Flag,
  LayoutDashboard,
  Network,
  NotebookPen,
  PieChart,
  Settings,
  Target,
  Wallet,
  Landmark,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const navGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { title: "Accounts", href: "/accounts", icon: Wallet },
      { title: "Transactions", href: "/transactions", icon: CreditCard },
      { title: "Transfers", href: "/transfers", icon: ArrowLeftRight },
    ],
  },
  {
    label: "Planning",
    items: [
      { title: "Savings & goals", href: "/goals", icon: Target },
      { title: "Loans", href: "/loans", icon: Landmark },
      { title: "Budget", href: "/budget", icon: PieChart },
      { title: "Reports", href: "/reports", icon: FileText },
    ],
  },
  {
    label: "Workspace",
    items: [
      { title: "Notes & plans", href: "/notes", icon: NotebookPen },
      { title: "Ops5ive", href: "/ops5ive", icon: Briefcase },
      { title: "Upwork", href: "/ops5ive/upwork", icon: Flag },
      { title: "LinkedIn", href: "/ops5ive/linkedin", icon: Network },
    ],
  },
  {
    label: "System",
    items: [
      { title: "Notifications", href: "/notifications", icon: Bell },
      { title: "Activity", href: "/activity", icon: FileText },
      { title: "Settings", href: "/settings", icon: Settings },
    ],
  },
];

export const mobilePrimaryNav: NavItem[] = [
  { title: "Home", href: "/dashboard", icon: LayoutDashboard },
  { title: "Accounts", href: "/accounts", icon: Wallet },
  { title: "Activity", href: "/transactions", icon: CreditCard },
  { title: "Goals", href: "/goals", icon: Target },
  { title: "More", href: "#more", icon: Settings },
];
