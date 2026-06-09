import { describe, expect, it } from "vitest";
import { formatTime } from "./hooks";

describe("formatTime", () => {
  it("formats focus timer values", () => {
    expect(formatTime(1500)).toBe("25:00");
    expect(formatTime(61)).toBe("01:01");
    expect(formatTime(0)).toBe("00:00");
  });
});
