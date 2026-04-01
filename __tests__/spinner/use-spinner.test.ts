// @vitest-environment jsdom
import { renderHook, act } from "@testing-library/react";
import { useSpinner } from "@/lib/spinner/use-spinner";

const items = [
  { id: 1, name: "김밥천국" },
  { id: 2, name: "맥도날드" },
  { id: 3, name: "스시로" },
];

describe("useSpinner", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("initial state is idle with no selection", () => {
    const { result } = renderHook(() => useSpinner(items));
    expect(result.current.state).toBe("idle");
    expect(result.current.selectedItem).toBeNull();
  });

  it("spin transitions to spinning", () => {
    const { result } = renderHook(() => useSpinner(items));
    act(() => {
      result.current.spin();
    });
    expect(result.current.state).toBe("spinning");
  });

  it("spin ignored when already spinning", () => {
    const { result } = renderHook(() =>
      useSpinner(items, { randomFn: () => 0.0 })
    );

    act(() => {
      result.current.spin();
    });
    expect(result.current.state).toBe("spinning");
    const firstSelected = result.current.selectedItem;

    // Second spin should be ignored
    act(() => {
      result.current.spin();
    });
    expect(result.current.selectedItem).toBe(firstSelected);
  });

  it("spin ignored when items empty", () => {
    const { result } = renderHook(() => useSpinner([]));
    act(() => {
      result.current.spin();
    });
    expect(result.current.state).toBe("idle");
  });

  it("spin completes with selected item after duration", () => {
    const { result } = renderHook(() =>
      useSpinner(items, { duration: 1000, randomFn: () => 0.0 })
    );

    act(() => {
      result.current.spin();
    });
    expect(result.current.state).toBe("spinning");

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.state).toBe("result");
    expect(result.current.selectedItem).toEqual({ id: 1, name: "김밥천국" });
  });

  it("reset returns to idle", () => {
    const { result } = renderHook(() =>
      useSpinner(items, { duration: 1000, randomFn: () => 0.0 })
    );

    act(() => {
      result.current.spin();
    });
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.state).toBe("result");

    act(() => {
      result.current.reset();
    });
    expect(result.current.state).toBe("idle");
    expect(result.current.selectedItem).toBeNull();
  });
});
