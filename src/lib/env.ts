import { z } from "zod";

/**
 * Reads Supabase env with support for the project's non-standard aliases
 * while preferring canonical names.
 */
function readEnv(name: string, aliases: string[] = []): string | undefined {
  const keys = [name, ...aliases];
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return undefined;
}

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required"),
});

// Deliberately defined as its own object instead of `publicSchema.extend(...)`.
// This keeps environment validation simple across Next's proxy, webpack, and
// Turbopack compilation paths.
const serverSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required"),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, "SUPABASE_SERVICE_ROLE_KEY is required for admin/server operations"),
  EXCHANGE_RATE_API_KEY: z.string().optional(),
});

export type PublicEnv = z.infer<typeof publicSchema>;
export type ServerEnv = z.infer<typeof serverSchema>;

function missingMessage(issues: z.ZodIssue[]): string {
  const details = issues
    .map((issue) => `- ${issue.path.join(".") || "env"}: ${issue.message}`)
    .join("\n");
  return [
    "Hisab environment configuration is incomplete.",
    "Add the variables from `.env.example` to `.env` or `.env.local`.",
    "Preferred names:",
    "  NEXT_PUBLIC_SUPABASE_URL",
    "  NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "  SUPABASE_SERVICE_ROLE_KEY",
    "Aliases also accepted for now:",
    "  SUPABASE_URL",
    "  SUPABASE_ANON_PUBLICK_KEY / SUPABASE_ANON_KEY",
    "",
    details,
  ].join("\n");
}

function resolvePublicInput() {
  return {
    NEXT_PUBLIC_SUPABASE_URL: readEnv("NEXT_PUBLIC_SUPABASE_URL", ["SUPABASE_URL"]),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", [
      "SUPABASE_ANON_KEY",
      "SUPABASE_ANON_PUBLICK_KEY",
    ]),
  };
}

function resolveServerInput() {
  return {
    ...resolvePublicInput(),
    SUPABASE_SERVICE_ROLE_KEY: readEnv("SUPABASE_SERVICE_ROLE_KEY"),
    EXCHANGE_RATE_API_KEY: readEnv("EXCHANGE_RATE_API_KEY") || undefined,
  };
}

let cachedPublic: PublicEnv | null = null;
let cachedServer: ServerEnv | null = null;

export function getPublicEnv(): PublicEnv {
  if (cachedPublic) return cachedPublic;
  const parsed = publicSchema.safeParse(resolvePublicInput());
  if (!parsed.success) {
    throw new Error(missingMessage(parsed.error.issues));
  }
  cachedPublic = parsed.data;
  return cachedPublic;
}

export function getServerEnv(): ServerEnv {
  if (cachedServer) return cachedServer;
  const parsed = serverSchema.safeParse(resolveServerInput());
  if (!parsed.success) {
    throw new Error(missingMessage(parsed.error.issues));
  }
  cachedServer = parsed.data;
  return cachedServer;
}

/** Soft check for proxy / early boot without throwing during static analysis. */
export function hasPublicSupabaseEnv(): boolean {
  const input = resolvePublicInput();
  return Boolean(input.NEXT_PUBLIC_SUPABASE_URL && input.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
