import { readFileSync } from "fs";
import { join } from "path";

const cssContent = readFileSync(
  join(__dirname, "../../app/globals.css"),
  "utf-8"
);

describe("Theme System", () => {
  it("defines theme color variables matching theme.json", () => {
    expect(cssContent).toContain("--color-primary: #4a7c59");
    expect(cssContent).toContain("--color-secondary: #f9a620");
    expect(cssContent).toContain("--color-accent: #b7472a");
    expect(cssContent).toContain("--color-background: #f5f3ed");
  });

  it("defines font variables", () => {
    expect(cssContent).toContain("--font-heading:");
    expect(cssContent).toContain("--font-body:");
  });

  it("defines semantic color tokens", () => {
    expect(cssContent).toContain("--color-text:");
    expect(cssContent).toContain("--color-text-muted:");
    expect(cssContent).toContain("--color-border:");
    expect(cssContent).toContain("--color-surface:");
  });
});
