import { pickRandomItem, calculateSegments } from "@/lib/spinner/pick-random-item";

describe("pickRandomItem", () => {
  const items = [
    { id: 1, name: "김밥천국" },
    { id: 2, name: "맥도날드" },
    { id: 3, name: "스시로" },
  ];

  it("returns an item from the list", () => {
    const result = pickRandomItem(items);
    expect(items).toContainEqual(result);
  });

  it("returns deterministic result with custom randomFn", () => {
    // randomFn returning 0.0 → index 0
    expect(pickRandomItem(items, () => 0.0)).toEqual({ id: 1, name: "김밥천국" });
    // randomFn returning 0.99 → index 2
    expect(pickRandomItem(items, () => 0.99)).toEqual({ id: 3, name: "스시로" });
  });

  it("throws when given empty list", () => {
    expect(() => pickRandomItem([])).toThrow("Cannot pick from an empty list");
  });
});

describe("calculateSegments", () => {
  it("divides circle equally among items", () => {
    const items = [{ name: "A" }, { name: "B" }, { name: "C" }, { name: "D" }];
    const segments = calculateSegments(items);

    expect(segments).toHaveLength(4);
    segments.forEach((seg) => {
      expect(seg.angle).toBe(90); // 360 / 4
    });
    expect(segments[0].startAngle).toBe(0);
    expect(segments[1].startAngle).toBe(90);
    expect(segments[2].startAngle).toBe(180);
    expect(segments[3].startAngle).toBe(270);
  });

  it("returns empty array for empty list", () => {
    expect(calculateSegments([])).toEqual([]);
  });
});
