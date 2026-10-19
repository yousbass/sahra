import { describe, expect, it } from "vitest";
import {
  hasMatchingAvailabilityLock,
  isAuthoritativeCampHost,
  isCancellableBookingStatus,
} from "./bookingStateGuards.js";

describe("server-authoritative booking state guards", () => {
  it.each(["pending", "confirmed"])(
    "allows cancellation from %s",
    (status) => {
      expect(isCancellableBookingStatus(status)).toBe(true);
    },
  );

  it.each(["completed", "cancelled", "refunded", "", "failed"])(
    "rejects cancellation from terminal or unsupported status %s",
    (status) => {
      expect(isCancellableBookingStatus(status)).toBe(false);
    },
  );

  it("authorizes a host only from the current camp owner record", () => {
    expect(isAuthoritativeCampHost({ hostId: "current-host" }, "current-host")).toBe(true);
    expect(isAuthoritativeCampHost({ hostId: "current-host" }, "former-host")).toBe(false);
    expect(isAuthoritativeCampHost(null, "current-host")).toBe(false);
  });

  it("requires an existing lock that belongs to this exact booking", () => {
    expect(hasMatchingAvailabilityLock({ bookingId: "booking-1" }, "booking-1")).toBe(true);
    expect(hasMatchingAvailabilityLock({ bookingId: "booking-2" }, "booking-1")).toBe(false);
    expect(hasMatchingAvailabilityLock(null, "booking-1")).toBe(false);
  });
});