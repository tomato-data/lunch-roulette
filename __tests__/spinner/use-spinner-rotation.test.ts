// @vitest-environment jsdom
import { renderHook, act } from "@testing-library/react";
import { useSpinner } from "@/lib/spinner/use-spinner";

const items = [
  { id: 1, name: "김밥천국" },
  { id: 2, name: "맥도날드" },
  { id: 3, name: "스시로" },
];

describe("useSpinner rotation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("spin returns targetRotation greater than 0", () => {
    const { result } = renderHook(() =>
      useSpinner(items, { randomFn: () => 0.0 })
    );
    act(() => {
      result.current.spin();
    });
    expect(result.current.targetRotation).toBeGreaterThan(0);
  });

  it("targetRotation includes at least 5 full spins (1800 degrees)", () => {
    const { result } = renderHook(() =>
      useSpinner(items, { randomFn: () => 0.5 })
    );
    act(() => {
      result.current.spin();
    });
    expect(result.current.targetRotation).toBeGreaterThanOrEqual(1800);
  });

  it("targetRotation lands on selected segment", () => {
    // randomFn=0.0 → selects index 0 (김밥천국)
    const { result } = renderHook(() =>
      useSpinner(items, { randomFn: () => 0.0 })
    );
    act(() => {
      result.current.spin();
    });

    const segmentAngle = 360 / items.length;
    const rotation = result.current.targetRotation % 360;
    // Pointer is at top (0°). The wheel rotates clockwise.
    // For index 0: segment center is at segmentAngle/2 = 60°
    // Wheel needs to rotate so that segment 0 center aligns with pointer (top).
    // rotation should put segment 0 center at the top: 360 - 60 = 300°
    const expectedBase = 360 - (0 * segmentAngle + segmentAngle / 2);
    expect(rotation).toBeCloseTo(expectedBase, 0);
  });

  it("cumulative rotation increases with each spin", () => {
    const { result } = renderHook(() =>
      useSpinner(items, { randomFn: () => 0.5 })
    );
    act(() => {
      result.current.spin();
    });
    const firstRotation = result.current.targetRotation;

    // Complete spin via onSpinEnd
    act(() => {
      result.current.onSpinEnd();
    });

    // Reset and spin again
    act(() => {
      result.current.reset();
    });
    act(() => {
      result.current.spin();
    });
    expect(result.current.targetRotation).toBeGreaterThan(firstRotation);
  });

  it("onSpinEnd transitions state from spinning to result", () => {
    const { result } = renderHook(() =>
      useSpinner(items, { randomFn: () => 0.0 })
    );
    act(() => {
      result.current.spin();
    });
    expect(result.current.state).toBe("spinning");

    act(() => {
      result.current.onSpinEnd();
    });
    expect(result.current.state).toBe("result");
  });

  it("reset preserves cumulative rotation for next spin", () => {
    const { result } = renderHook(() =>
      useSpinner(items, { randomFn: () => 0.0 })
    );

    // First spin
    act(() => {
      result.current.spin();
    });
    const firstRotation = result.current.targetRotation;
    act(() => {
      result.current.onSpinEnd();
    });

    // Reset
    act(() => {
      result.current.reset();
    });
    expect(result.current.state).toBe("idle");

    // Second spin should build on cumulative
    act(() => {
      result.current.spin();
    });
    expect(result.current.targetRotation).toBeGreaterThan(firstRotation);
  });
});
