// @vitest-environment jsdom
import { render, screen, fireEvent, act } from "@testing-library/react";
import SpinnerWheel from "@/app/spinner/spinner-wheel";

const restaurants = [
  { id: 1, name: "김밥천국", category: "한식" },
  { id: 2, name: "맥도날드", category: "양식" },
  { id: 3, name: "스시로", category: "일식" },
];

describe("SpinnerWheel themed", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("applies rotation transform on spin", () => {
    render(<SpinnerWheel items={restaurants} />);
    fireEvent.click(screen.getByText("돌리기!"));

    const wheel = screen.getByTestId("wheel");
    const style = wheel.style.transform;
    expect(style).toMatch(/rotate\(\d+(\.\d+)?deg\)/);
  });

  it("uses proper easing cubic-bezier for transition", () => {
    render(<SpinnerWheel items={restaurants} />);
    fireEvent.click(screen.getByText("돌리기!"));

    const wheel = screen.getByTestId("wheel");
    expect(wheel.style.transition).toContain("cubic-bezier");
  });

  it("shows result after transitionEnd event", () => {
    render(<SpinnerWheel items={restaurants} />);
    fireEvent.click(screen.getByText("돌리기!"));

    const wheel = screen.getByTestId("wheel");
    fireEvent.transitionEnd(wheel);

    expect(screen.getByTestId("result")).toBeDefined();
    expect(screen.getByText("오늘의 점심은")).toBeDefined();
  });

  it("renders center hub element", () => {
    render(<SpinnerWheel items={restaurants} />);
    expect(screen.getByTestId("center-hub")).toBeDefined();
  });

  it("shows themed result display", () => {
    render(<SpinnerWheel items={restaurants} />);
    fireEvent.click(screen.getByText("돌리기!"));

    const wheel = screen.getByTestId("wheel");
    fireEvent.transitionEnd(wheel);

    const result = screen.getByTestId("result");
    expect(result).toBeDefined();
  });

  it("shows empty message when no restaurants", () => {
    render(<SpinnerWheel items={[]} />);
    expect(screen.getByText(/등록된 식당이 없습니다/)).toBeDefined();
  });
});
