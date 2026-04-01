export interface Segment<T> {
  item: T;
  startAngle: number;
  angle: number;
}

export function calculateSegments<T>(items: T[]): Segment<T>[] {
  if (items.length === 0) return [];
  const angle = 360 / items.length;
  return items.map((item, i) => ({
    item,
    startAngle: i * angle,
    angle,
  }));
}

export function pickRandomItem<T>(items: T[], randomFn: () => number = Math.random): T {
  if (items.length === 0) {
    throw new Error("Cannot pick from an empty list");
  }
  const index = Math.floor(randomFn() * items.length);
  return items[index];
}
