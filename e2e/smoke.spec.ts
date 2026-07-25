import { test, expect } from "@playwright/test";

test.describe("Hisab smoke", () => {
  test("login page renders", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Hisab" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
    await expect(page.getByText("Private workspace for approved Hisab members")).toBeVisible();
  });

  test("login page lists all approved emails", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByText("anum112004@gmail.com")).toBeVisible();
    await expect(page.getByText("sarahbatool23@gmail.com")).toBeVisible();
  });
});
