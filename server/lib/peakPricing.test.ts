import { describe, it, expect } from "vitest";
import {
  getNightlyRateForDate,
  getStartingRate,
  hasPeakPricing,
  isWeekendDate,
  isHolidayDate,
  toDateKey,
} from "./peakPricing.js";

// 2026-08-20 is a Thursday, 2026-08-21 a Friday, 2026-08-22 a Saturday.
// 2026-12-16 is Bahrain National Day (public holiday).
const camp = { pricePerNight: 20, weekendPrice: 30, holidayPrice: 40 };

describe("date helpers", () => {
  it("detects Bahrain weekend nights (Thu & Fri)", () => {
    expect(isWeekendDate("2026-08-20")).toBe(true); // Thu
    expect(isWeekendDate("2026-08-21")).toBe(true); // Fri
    expect(isWeekendDate("2026-08-22")).toBe(false); // Sat
    expect(isWeekendDate("2026-08-23")).toBe(false); // Sun
  });

  it("detects public holidays", () => {
    expect(isHolidayDate("2026-12-16")).toBe(true);
    expect(isHolidayDate("2026-12-15")).toBe(false);
  });

  it("normalizes datetime strings and Dates to date keys", () => {
    expect(toDateKey("2026-08-21 08:00")).toBe("2026-08-21");
    expect(toDateKey(new Date(2026, 7, 21, 8, 0))).toBe("2026-08-21");
    expect(toDateKey("not a date")).toBe("");
  });
});

describe("getNightlyRateForDate", () => {
  it("returns the standard rate on regular nights", () => {
    expect(getNightlyRateForDate(camp, "2026-08-22")).toEqual({ rate: 20, kind: "standard" });
  });

  it("returns the weekend rate on Thursday and Friday", () => {
    expect(getNightlyRateForDate(camp, "2026-08-20")).toEqual({ rate: 30, kind: "weekend" });
    expect(getNightlyRateForDate(camp, "2026-08-21 08:00")).toEqual({ rate: 30, kind: "weekend" });
  });

  it("holiday rate beats weekend rate", () => {
    // 2026-12-17 (National Day) is a Thursday — holiday wins.
    expect(getNightlyRateForDate(camp, "2026-12-17")).toEqual({ rate: 40, kind: "holiday" });
  });

  it("falls back to weekend rate on a holiday without holidayPrice", () => {
    expect(getNightlyRateForDate({ pricePerNight: 20, weekendPrice: 30 }, "2026-12-17")).toEqual({
      rate: 30,
      kind: "weekend",
    });
  });

  it("falls back to standard when peak fields are absent or invalid", () => {
    expect(getNightlyRateForDate({ pricePerNight: 20 }, "2026-08-20")).toEqual({
      rate: 20,
      kind: "standard",
    });
    expect(getNightlyRateForDate({ pricePerNight: 20, weekendPrice: 0 }, "2026-08-20")).toEqual({
      rate: 20,
      kind: "standard",
    });
  });

  it("supports the legacy `price` field", () => {
    expect(getNightlyRateForDate({ price: 15 }, "2026-08-20")).toEqual({
      rate: 15,
      kind: "standard",
    });
    expect(getNightlyRateForDate({ price: 15, weekendPrice: 25 }, "2026-08-20")).toEqual({
      rate: 25,
      kind: "weekend",
    });
  });
});

describe("card display helpers (camp + kashta card inputs)", () => {
  it("hasPeakPricing is false without differing peak rates", () => {
    expect(hasPeakPricing({ pricePerNight: 20 })).toBe(false);
    expect(hasPeakPricing({ pricePerNight: 20, weekendPrice: 20 })).toBe(false);
    expect(hasPeakPricing(camp)).toBe(true);
  });

  it("getStartingRate returns the lowest configured rate", () => {
    expect(getStartingRate(camp)).toBe(20);
    // Host discounts weekends below standard — "from" shows the cheaper rate.
    expect(getStartingRate({ pricePerNight: 20, weekendPrice: 12 })).toBe(12);
  });

  it("works with kashta card listing shape (price + pricePerNight both set)", () => {
    // Kashta cards map camp.price → pricePerNight and carry peak fields through.
    const kashtaListing = { pricePerNight: 18, price: 18, weekendPrice: 28, holidayPrice: 35 };
    expect(hasPeakPricing(kashtaListing)).toBe(true);
    expect(getStartingRate(kashtaListing)).toBe(18);
    expect(getNightlyRateForDate(kashtaListing, "2026-08-21").rate).toBe(28);

    const flatKashta = { pricePerNight: 18, price: 18 };
    expect(hasPeakPricing(flatKashta)).toBe(false);
    expect(getStartingRate(flatKashta)).toBe(18);
  });
});
