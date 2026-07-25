import { describe, expect, it } from "vitest";
import { emailToLegacyUserId, isApprovedEmail, isSharedWorkspaceEmail } from "@/lib/auth/approved-users";

describe("approved users", () => {
  it("includes all four approved emails", () => {
    expect(isApprovedEmail("anum112004@gmail.com")).toBe(true);
    expect(isApprovedEmail("sarahbatool23@gmail.com")).toBe(true);
    expect(isApprovedEmail("outsider@example.com")).toBe(false);
  });

  it("maps emails to legacy user ids", () => {
    expect(emailToLegacyUserId("anum112004@gmail.com")).toBe("anum");
    expect(emailToLegacyUserId("sarahbatool23@gmail.com")).toBe("sarah");
  });

  it("identifies shared workspace emails", () => {
    expect(isSharedWorkspaceEmail("arsalanrs005@gmail.com")).toBe(true);
    expect(isSharedWorkspaceEmail("anum112004@gmail.com")).toBe(false);
  });
});
