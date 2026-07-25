import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentProfile } from "@/data/profiles/queries";
import type { Tables } from "@/types/database";

import type { WorkspaceContext, WorkspaceMemberSummary } from "@/data/workspaces/types";

export type { WorkspaceContext, WorkspaceMemberSummary };

export const dynamic = "force-dynamic";

export async function getAccessibleWorkspaces(): Promise<WorkspaceContext[]> {
  const profile = await requireCurrentProfile();
  const supabase = await createClient();

  const { data: memberships, error } = await supabase
    .from("workspace_memberships")
    .select("*")
    .eq("profile_id", profile.id)
    .eq("is_active", true);

  if (error) throw new Error("Unable to load workspaces.");

  const workspaceIds = (memberships ?? []).map((m) => m.workspace_id);
  if (workspaceIds.length === 0) return [];

  const [{ data: workspaces }, { data: allMemberships }, { data: profiles }] = await Promise.all([
    supabase.from("workspaces").select("*").in("id", workspaceIds).eq("is_active", true),
    supabase.from("workspace_memberships").select("*").in("workspace_id", workspaceIds).eq("is_active", true),
    supabase.from("profiles").select("id, display_name, email"),
  ]);

  const workspaceById = new Map((workspaces ?? []).map((w) => [w.id, w]));
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  return (memberships ?? [])
    .map((membership) => {
      const workspace = workspaceById.get(membership.workspace_id);
      if (!workspace) return null;

      const members = (allMemberships ?? [])
        .filter((m) => m.workspace_id === workspace.id)
        .map((m) => {
          const p = profileById.get(m.profile_id);
          return {
            profileId: m.profile_id,
            displayName: p?.display_name ?? "Member",
            email: p?.email ?? "",
            role: m.role as "admin" | "member",
          };
        });

      return {
        workspaceId: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        type: workspace.workspace_type as "shared" | "personal",
        currentProfileId: profile.id,
        role: membership.role as "admin" | "member",
        memberships: members,
      } satisfies WorkspaceContext;
    })
    .filter((w): w is WorkspaceContext => w !== null);
}

export async function getCurrentWorkspace(): Promise<WorkspaceContext | null> {
  const workspaces = await getAccessibleWorkspaces();
  return workspaces[0] ?? null;
}

export async function requireCurrentWorkspace(): Promise<WorkspaceContext> {
  const workspace = await getCurrentWorkspace();
  if (!workspace) {
    redirect("/login");
  }
  return workspace;
}

export async function getWorkspaceBySlug(slug: string): Promise<WorkspaceContext | null> {
  const workspaces = await getAccessibleWorkspaces();
  return workspaces.find((w) => w.slug === slug) ?? null;
}

export async function requireWorkspaceBySlug(slug: string): Promise<WorkspaceContext> {
  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace) {
    redirect("/dashboard");
  }
  return workspace;
}

export async function getCurrentWorkspaceMembership() {
  const workspace = await requireCurrentWorkspace();
  return {
    workspaceId: workspace.workspaceId,
    role: workspace.role,
    profileId: workspace.currentProfileId,
  };
}

export type WorkspaceRow = Tables<"workspaces">;
