import { describe, expect, it } from "vitest";
import { isSafeInternalRedirect, resolveSafeRedirect } from "@/lib/auth/safe-redirect";

describe("safe redirect", () => {
  it("accepts normal internal paths", () => {
    expect(isSafeInternalRedirect("/dashboard")).toBe(true);
    expect(isSafeInternalRedirect("/accounts/abc")).toBe(true);
  });

  it("rejects protocol-relative and external paths", () => {
    expect(isSafeInternalRedirect("//evil.com")).toBe(false);
    expect(isSafeInternalRedirect("https://evil.com")).toBe(false);
    expect(isSafeInternalRedirect("/\\evil.com")).toBe(false);
    expect(isSafeInternalRedirect("/user@evil.com")).toBe(false);
  });

  it("falls back when unsafe", () => {
    expect(resolveSafeRedirect("//evil.com", "/login")).toBe("/login");
    expect(resolveSafeRedirect("/goals", "/dashboard")).toBe("/goals");
  });
});
