import { getNotesPageData } from "@/data/notes/queries";
import { NotesClient } from "./notes-client";

export const dynamic = "force-dynamic";

export default async function NotesPage() {
  const data = await getNotesPageData();
  return <NotesClient {...data} />;
}
