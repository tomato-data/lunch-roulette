import { describe, it, expect } from "vitest";
import { generatePhotoFilename, getPhotoUrl } from "@/lib/photo";

describe("generatePhotoFilename", () => {
  it("should generate unique filenames on each call", () => {
    const name1 = generatePhotoFilename("photo.jpg");
    const name2 = generatePhotoFilename("photo.jpg");

    expect(name1).not.toBe(name2);
  });

  it("should preserve the original file extension", () => {
    expect(generatePhotoFilename("photo.jpg")).toMatch(/\.jpg$/);
    expect(generatePhotoFilename("image.png")).toMatch(/\.png$/);
    expect(generatePhotoFilename("pic.webp")).toMatch(/\.webp$/);
  });
});

describe("getPhotoUrl", () => {
  it("should return a public URL path from stored photo path", () => {
    const url = getPhotoUrl("abc123.jpg");

    expect(url).toBe("/uploads/restaurants/abc123.jpg");
  });
});
