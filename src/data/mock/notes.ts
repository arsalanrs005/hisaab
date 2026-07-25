import type { Note, NoteFolder } from "@/types";

export const noteFolders: NoteFolder[] = [
  { id: "folder-quick", name: "Shared quick notes", icon: "zap" },
  { id: "folder-financial", name: "Financial plans", icon: "landmark" },
  { id: "folder-spending", name: "Spending decisions", icon: "wallet" },
  { id: "folder-house", name: "House plan", icon: "home" },
  { id: "folder-car", name: "Car plan", icon: "car" },
  { id: "folder-loan", name: "Loan notes", icon: "file-text" },
  { id: "folder-ops", name: "Ops5ive strategy", icon: "briefcase" },
  { id: "folder-upwork", name: "Upwork plan", icon: "globe" },
  { id: "folder-linkedin", name: "LinkedIn plan", icon: "linkedin" },
  { id: "folder-clients", name: "Client notes", icon: "users" },
  { id: "folder-reviews", name: "Monthly reviews", icon: "calendar" },
];

export const notes: Note[] = [
  {
    id: "note-quick-1",
    title: "July cash buffer check",
    content:
      "Keep at least PKR 300,000 liquid across HBL accounts before the house advance discussion next month.\n\nAction: Transfer surplus from Ali HBL after university fee clears.",
    folderId: "folder-quick",
    ownerId: "arsalan",
    tags: ["cash", "buffer"],
    priority: "high",
    pinned: true,
    dueDate: "2026-07-31",
    checklist: [
      { id: "c1", text: "Confirm Ali university fee cleared", done: true },
      { id: "c2", text: "Review Meezan available balance", done: false },
      { id: "c3", text: "Set aside buffer", done: false },
    ],
    relatedAccountId: "acc-arsalan-meezan",
    updatedAt: "2026-07-22T14:00:00Z",
    createdAt: "2026-07-20T09:00:00Z",
  },
  {
    id: "note-house-1",
    title: "House advance target breakdown",
    content:
      "Target advance: PKR 5,000,000\n\nCurrent saved: PKR 1,250,000\nMonthly target: PKR 200,000 combined\n\nPreferred societies shortlist:\n1. Bahria Town — Phase 8\n2. DHA Phase extension\n3. Gulberg Greens plots\n\nDecision deadline: March 2027 for initial booking.",
    folderId: "folder-house",
    ownerId: "arsalan",
    tags: ["house", "goal"],
    priority: "high",
    pinned: true,
    checklist: [
      { id: "c1", text: "Visit Bahria Town Saturday", done: false },
      { id: "c2", text: "Compare markup options", done: false },
    ],
    relatedGoalId: "goal-house",
    updatedAt: "2026-07-21T11:00:00Z",
    createdAt: "2026-06-01T10:00:00Z",
  },
  {
    id: "note-car-1",
    title: "Elantra 2021 purchase plan",
    content:
      "Budget ceiling: PKR 3,500,000\nPreferred color: Phantom Black\nInspection checklist ready.\n\nIncrease monthly contribution by PKR 50,000 to pull completion forward by ~2 months.",
    folderId: "folder-car",
    ownerId: "ali",
    tags: ["car", "elantra"],
    priority: "medium",
    pinned: false,
    relatedGoalId: "goal-elantra",
    checklist: [
      { id: "c1", text: "Get three dealer quotes", done: true },
      { id: "c2", text: "Book inspection", done: false },
    ],
    updatedAt: "2026-07-18T16:00:00Z",
    createdAt: "2026-05-15T12:00:00Z",
  },
  {
    id: "note-loan-1",
    title: "Car loan payoff schedule",
    content:
      "Remaining: PKR 420,000\nInstallment: PKR 85,000 on the 18th\n\nConsider early settlement in November if Ops5ive Q3 is strong.",
    folderId: "folder-loan",
    ownerId: "arsalan",
    tags: ["loan"],
    priority: "medium",
    pinned: false,
    relatedGoalId: "goal-car-loan",
    checklist: [],
    updatedAt: "2026-07-18T10:00:00Z",
    createdAt: "2026-04-01T10:00:00Z",
  },
  {
    id: "note-ops-1",
    title: "Ops5ive Q3 growth priorities",
    content:
      "Focus areas:\n1. Convert Greg to retainer\n2. Close HelloForce phase 2\n3. LinkedIn outreach cadence: 25/week\n4. Protect 20% of net profit into Ops5ive reserve\n\nRevenue goal: PKR 1.8M/month by September.",
    folderId: "folder-ops",
    ownerId: "arsalan",
    tags: ["ops5ive", "strategy"],
    priority: "high",
    pinned: true,
    relatedGoalId: "goal-ops5ive",
    relatedBusinessPlan: "q3-growth",
    checklist: [
      { id: "c1", text: "Send Greg retainer proposal", done: false },
      { id: "c2", text: "HelloForce SOW draft", done: true },
      { id: "c3", text: "Hire part-time VA", done: false },
    ],
    updatedAt: "2026-07-23T09:00:00Z",
    createdAt: "2026-07-01T09:00:00Z",
  },
  {
    id: "note-spending-1",
    title: "Food budget overrun review",
    content:
      "Food is 18% above last month. Drivers: more takeout weeks and weekend dinners.\n\nCap takeout to 2x/week for remainder of July.",
    folderId: "folder-spending",
    ownerId: "ali",
    tags: ["budget", "food"],
    priority: "medium",
    pinned: false,
    checklist: [{ id: "c1", text: "Update food budget alert to 80%", done: true }],
    updatedAt: "2026-07-21T18:00:00Z",
    createdAt: "2026-07-21T18:00:00Z",
  },
  {
    id: "note-upwork-1",
    title: "Upwork weekly targets",
    content:
      "Weekly: 12 proposals, 40 connects max.\nFocus niches: SaaS dashboards, fintech UI, Next.js rebuilds.\n\nStop bidding below $45/hr.",
    folderId: "folder-upwork",
    ownerId: "ali",
    tags: ["upwork"],
    priority: "medium",
    pinned: false,
    checklist: [],
    updatedAt: "2026-07-20T08:00:00Z",
    createdAt: "2026-07-01T08:00:00Z",
  },
  {
    id: "note-linkedin-1",
    title: "LinkedIn outreach playbook",
    content:
      "ICP: Series A–B SaaS founders, US/UK, product-led.\nMessage framework: value observation → relevant case → soft ask.\n\nWeekly target: 25 connection requests, 10 conversations.",
    folderId: "folder-linkedin",
    ownerId: "arsalan",
    tags: ["linkedin", "sales"],
    priority: "medium",
    pinned: false,
    checklist: [],
    updatedAt: "2026-07-19T12:00:00Z",
    createdAt: "2026-06-15T12:00:00Z",
  },
];

export function getNote(id: string): Note | undefined {
  return notes.find((n) => n.id === id);
}

export function getNotesByFolder(folderId: string): Note[] {
  return notes.filter((n) => n.folderId === folderId);
}
