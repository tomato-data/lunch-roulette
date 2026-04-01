// @vitest-environment jsdom
import { render, screen, fireEvent, act } from "@testing-library/react";
import SpinnerWheel from "@/app/spinner/spinner-wheel";

const restaurants = [
  { id: 1, name: "김밥천국", category: "한식" },
  { id: 2, name: "맥도날드", category: "양식" },
  { id: 3, name: "스시로", category: "일식" },
];

describe("SpinnerWheel", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders all restaurant names on wheel", () => {
    render(<SpinnerWheel items={restaurants} />);
    restaurants.forEach((r) => {
      expect(screen.getByText(r.name)).toBeDefined();
    });
  });

  it("renders spin button", () => {
    render(<SpinnerWheel items={restaurants} />);
    expect(screen.getByText("돌리기!")).toBeDefined();
  });

  it("spin button click triggers spinning state", () => {
    render(<SpinnerWheel items={restaurants} />);
    fireEvent.click(screen.getByText("돌리기!"));
    expect(screen.getByText("돌리는 중...")).toBeDefined();
  });

  it("displays result after spin completes", () => {
    render(<SpinnerWheel items={restaurants} />);
    fireEvent.click(screen.getByText("돌리기!"));

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.getByTestId("result")).toBeDefined();
    expect(screen.getByText("오늘의 점심은")).toBeDefined();
  });

  it("spin button disabled during spinning", () => {
    render(<SpinnerWheel items={restaurants} />);
    fireEvent.click(screen.getByText("돌리기!"));
    const button = screen.getByText("돌리는 중...");
    expect(button).toHaveProperty("disabled", true);
  });

  it("shows empty message when no restaurants", () => {
    render(<SpinnerWheel items={[]} />);
    expect(screen.getByText(/등록된 식당이 없습니다/)).toBeDefined();
  });
});
