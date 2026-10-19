import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const rulesPath = new URL("../../firestore.rules", import.meta.url);

async function readRules(): Promise<string> {
  return readFile(rulesPath, "utf8");
}

describe("booking Firestore rule guardrails", () => {
  it("does not permit a guest to cancel a booking directly", async () => {
    const rules = await readRules();

    expect(rules).not.toContain("function isGuestCancellation()");
    expect(rules).not.toContain("isGuestCancellation()");
    expect(rules).toContain("Cancellation, host acceptance/decline, cash collection, refunds");
  });

  it("does not permit a host to confirm or decline a booking directly", async () => {
    const rules = await readRules();

    expect(rules).not.toContain("function isHostBookingAction()");
    expect(rules).not.toContain("isHostBookingAction()");
  });

  it("keeps the only non-admin booking update scoped to payment verification", async () => {
    const rules = await readRules();
    const bookingMatch = rules.match(
      /match \/bookings\/\{bookingId\} \{([\s\S]*?)\/\/ Only admins can delete bookings/,
    );

    expect(bookingMatch).not.toBeNull();
    expect(bookingMatch?.[1]).toContain("isGuestPaymentSettlement()");
    expect(bookingMatch?.[1]).toMatch(
      /allow update: if isSignedIn\(\) && \(\s*isAdmin\(\) \|\|\s*isGuestPaymentSettlement\(\)\s*\);/,
    );
  });
});