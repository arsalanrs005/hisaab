import { redirect } from "next/navigation";
import { requireWorkspaceBySlug } from "@/data/workspaces/queries";

export default async function WorkspaceScopedPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string; path?: string[] }>;
}) {
  const { workspaceSlug, path = [] } = await params;
  await requireWorkspaceBySlug(workspaceSlug);

  const target = path.length > 0 ? `/${path.join("/")}` : "/dashboard";
  redirect(target);
}
