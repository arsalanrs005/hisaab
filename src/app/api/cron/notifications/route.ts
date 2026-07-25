import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchLatestExchangeRate, cacheExchangeRate } from "@/lib/exchange-rates/fetch";

function authorizeCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = createAdminClient();
    const rate = await fetchLatestExchangeRate("USD", "PKR", { skipCache: true });
    await cacheExchangeRate(admin, rate.from, rate.to, rate.rate, rate.source);

    return NextResponse.json({
      ok: true,
      ranAt: new Date().toISOString(),
      exchangeRate: rate,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cron job failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
