import type { UiTransfer } from "@/data/transfers/mappers";
import type { ProfileSummary } from "@/data/profiles/helpers";

export interface TransfersQueryResult {
  transfers: UiTransfer[];
  total: number;
  page: number;
  pageSize: number;
  profiles: ProfileSummary[];
  currentProfileId: string;
}
