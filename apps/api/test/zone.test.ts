import { describe, expect, it } from "vitest";
import { addDays, daysBetween, isValidZone, localToUtc, utcToLocal } from "../src/lib/zone";

const HCM = "Asia/Ho_Chi_Minh";
const NY = "America/New_York";

describe("local time and UTC", () => {
  it("Ho Chi Minh is 7 hours ahead of UTC all year", () => {
    expect(localToUtc("2026-10-05", "18:30", HCM)).toBe("2026-10-05T11:30:00.000Z");
    expect(localToUtc("2026-01-05", "00:00", HCM)).toBe("2026-01-04T17:00:00.000Z");
    expect(utcToLocal("2026-10-05T11:30:00.000Z", HCM)).toEqual({ date: "2026-10-05", time: "18:30" });
  });

  it("puts a late evening lesson on the right local day", () => {
    // 23:30 in Ho Chi Minh is still the same day there, but the day before in UTC.
    const utc = localToUtc("2026-10-05", "23:30", HCM);
    expect(utc).toBe("2026-10-05T16:30:00.000Z");
    expect(utcToLocal("2026-10-04T18:00:00.000Z", HCM)).toEqual({ date: "2026-10-05", time: "01:00" });
  });

  it("goes both ways for every hour of a day", () => {
    for (const zone of [HCM, NY, "Europe/London", "Asia/Kolkata", "Pacific/Auckland"]) {
      for (let h = 0; h < 24; h++) {
        const time = `${String(h).padStart(2, "0")}:15`;
        const back = utcToLocal(localToUtc("2026-06-10", time, zone), zone);
        // (Only times that really exist on that day: 2026-06-10 has no clock change in these zones.)
        expect(back, `${zone} ${time}`).toEqual({ date: "2026-06-10", time });
      }
    }
  });

  it("keeps the same clock time across a change to summer time", () => {
    // New York: clocks go forward on 2026-03-08. A lesson at 18:00 stays at 18:00 on the wall.
    expect(localToUtc("2026-03-07", "18:00", NY)).toBe("2026-03-07T23:00:00.000Z"); // UTC-5
    expect(localToUtc("2026-03-14", "18:00", NY)).toBe("2026-03-14T22:00:00.000Z"); // UTC-4
    // So a week of 7 x 24 hours would have been wrong by an hour.
    expect(
      new Date("2026-03-14T22:00:00.000Z").getTime() - new Date("2026-03-07T23:00:00.000Z").getTime(),
    ).toBe(7 * 86_400_000 - 3_600_000);
  });

  it("handles the hour that does not exist and the hour that happens twice", () => {
    // 02:30 on 2026-03-08 does not exist in New York: the moment just after is used.
    expect(utcToLocal(localToUtc("2026-03-08", "02:30", NY), NY).time).toBe("03:30");
    // 01:30 on 2026-11-01 happens twice: the first one (still summer time, UTC-4).
    expect(localToUtc("2026-11-01", "01:30", NY)).toBe("2026-11-01T05:30:00.000Z");
  });
});

describe("calendar days", () => {
  it("adds days across months, years and leap days", () => {
    expect(addDays("2026-10-05", 7)).toBe("2026-10-12");
    expect(addDays("2026-10-28", 7)).toBe("2026-11-04");
    expect(addDays("2026-12-28", 7)).toBe("2027-01-04");
    expect(addDays("2028-02-25", 7)).toBe("2028-03-03"); // 2028 is a leap year
    expect(addDays("2026-10-05", -5)).toBe("2026-09-30");
    expect(addDays("2026-10-05", 0)).toBe("2026-10-05");
  });

  it("counts days between two dates", () => {
    expect(daysBetween("2026-10-05", "2026-10-12")).toBe(7);
    expect(daysBetween("2026-10-12", "2026-10-05")).toBe(-7);
    expect(daysBetween("2026-12-31", "2027-01-01")).toBe(1);
    expect(daysBetween("2026-03-01", "2026-03-01")).toBe(0);
  });

  it("knows which time zones exist", () => {
    expect(isValidZone(HCM)).toBe(true);
    expect(isValidZone("Not/AZone")).toBe(false);
  });
});
