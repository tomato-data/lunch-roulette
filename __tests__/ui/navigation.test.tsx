// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import Navigation from "@/app/components/navigation";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/spinner",
}));

describe("Navigation", () => {
  it("renders all navigation links", () => {
    render(<Navigation />);
    expect(screen.getByText("투표")).toBeDefined();
    expect(screen.getByText("룰렛")).toBeDefined();
    expect(screen.getByText("식당")).toBeDefined();
  });

  it("highlights current page link", () => {
    render(<Navigation />);
    const rouletteLink = screen.getByText("룰렛").closest("a");
    expect(rouletteLink?.getAttribute("data-active")).toBe("true");
  });

  it("renders app title", () => {
    render(<Navigation />);
    expect(screen.getByText("Lunch Roulette")).toBeDefined();
  });
});
