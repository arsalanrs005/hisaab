import { parseMoney } from "@/lib/money";

const FRANKFURTER_URL = "https://api.frankfurter.app/latest";
const STATIC_FALLBACK_RATE = 278.5;

export async function fetchLatestExchangeRate(
  from = "USD",
  to = "PKR",
  options?: { skipCache?: boolean }
) {
  if (from === to) {
    return {
      from,
      to,
      rate: 1,
      source: "identity",
      timestamp: new Date().toISOString(),
      isLive: true,
    };
  }

  if (!options?.skipCache) {
    try {
      const { createClient } = await import("@/lib/supabase/server");
      const supabase = await createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from("exchange_rate_cache")
        .select("*")
        .eq("from_currency", from)
        .eq("to_currency", to)
        .maybeSingle();

      if (data?.rate) {
        return {
          from,
          to,
          rate: parseMoney(data.rate),
          source: data.source ?? "cache",
          timestamp: data.fetched_at ?? new Date().toISOString(),
          isLive: data.source === "frankfurter.app",
        };
      }
    } catch {
      /* fall through to live fetch */
    }
  }

  try {
    const res = await fetch(`${FRANKFURTER_URL}?from=${from}&to=${to}`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error("FX API unavailable");
    const json = (await res.json()) as { rates?: Record<string, number>; date?: string };
    const rate = json.rates?.[to];
    if (!rate) throw new Error("Rate missing");

    const result = {
      from,
      to,
      rate: parseMoney(rate),
      source: "frankfurter.app",
      timestamp: json.date ?? new Date().toISOString(),
      isLive: true,
    };

    try {
      const { createClient } = await import("@/lib/supabase/server");
      const supabase = await createClient();
      await cacheExchangeRate(supabase, from, to, result.rate, result.source);
    } catch {
      /* cache write is best-effort */
    }

    return result;
  } catch {
    return {
      from,
      to,
      rate: STATIC_FALLBACK_RATE,
      source: "static-fallback (not live — configure EXCHANGE_RATE_API_KEY or retry refresh)",
      timestamp: new Date().toISOString(),
      isLive: false,
    };
  }
}

export async function cacheExchangeRate(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>,
  from: string,
  to: string,
  rate: number,
  source: string
) {
  await (supabase as any).from("exchange_rate_cache").upsert(
    {
      from_currency: from,
      to_currency: to,
      rate,
      source,
      fetched_at: new Date().toISOString(),
    },
    { onConflict: "from_currency,to_currency" }
  );
}
