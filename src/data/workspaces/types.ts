export interface WorkspaceMemberSummary {
  profileId: string;
  displayName: string;
  email: string;
  role: "admin" | "member";
}

export interface WorkspaceContext {
  workspaceId: string;
  name: string;
  slug: string;
  type: "shared" | "personal";
  currentProfileId: string;
  role: "admin" | "member";
  memberships: WorkspaceMemberSummary[];
}
