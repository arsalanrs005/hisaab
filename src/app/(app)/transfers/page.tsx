import { getTransfers } from "@/data/transfers/queries";
import { TransfersClient } from "./transfers-client";

export const dynamic = "force-dynamic";

export default async function TransfersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const result = await getTransfers({
    page: params.page ? Number(params.page) : 1,
    search: typeof params.q === "string" ? params.q : undefined,
    sourceAccountId: typeof params.source === "string" ? params.source : undefined,
    destinationAccountId: typeof params.dest === "string" ? params.dest : undefined,
    initiatorProfileId: typeof params.initiator === "string" ? params.initiator : undefined,
    sharedContributionOnly: params.shared === "1",
  });

  return (
    <TransfersClient
      result={result}
      initialDetailId={typeof params.detail === "string" ? params.detail : undefined}
      initialSearch={typeof params.q === "string" ? params.q : ""}
    />
  );
}
