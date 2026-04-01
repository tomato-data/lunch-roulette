// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import RestaurantAutocomplete from "@/app/components/restaurant-autocomplete";

function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe("RestaurantAutocomplete", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("should call search API with debounce after 0.5s", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ id: 1, name: "카츠올로지", category: "일식" }],
    });
    global.fetch = mockFetch;

    const onSelect = vi.fn();
    render(<RestaurantAutocomplete onSelect={onSelect} />);

    const input = screen.getByPlaceholderText("음식점 검색...");
    await act(async () => {
      fireEvent.change(input, { target: { value: "카츠" } });
    });

    expect(mockFetch).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(500);
      await flushPromises();
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/restaurants/search?q=%EC%B9%B4%EC%B8%A0"
    );
  });

  it("should display search results in dropdown", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        { id: 1, name: "카츠올로지", category: "일식" },
        { id: 2, name: "카츠올로지 옆", category: "일식" },
      ],
    });
    global.fetch = mockFetch;

    const onSelect = vi.fn();
    render(<RestaurantAutocomplete onSelect={onSelect} />);

    const input = screen.getByPlaceholderText("음식점 검색...");
    await act(async () => {
      fireEvent.change(input, { target: { value: "카츠" } });
      vi.advanceTimersByTime(500);
      await flushPromises();
    });

    expect(screen.getByText("카츠올로지")).toBeInTheDocument();
    expect(screen.getByText("카츠올로지 옆")).toBeInTheDocument();
  });

  it("should call onSelect with restaurant when item clicked", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ id: 1, name: "카츠올로지", category: "일식" }],
    });
    global.fetch = mockFetch;

    const onSelect = vi.fn();
    render(<RestaurantAutocomplete onSelect={onSelect} />);

    const input = screen.getByPlaceholderText("음식점 검색...");
    await act(async () => {
      fireEvent.change(input, { target: { value: "카츠" } });
      vi.advanceTimersByTime(500);
      await flushPromises();
    });

    await act(async () => {
      fireEvent.click(screen.getByText("카츠올로지"));
    });

    expect(onSelect).toHaveBeenCalledWith({ id: 1, name: "카츠올로지", category: "일식" });
  });

  it("should hide dropdown when input is cleared", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ id: 1, name: "카츠올로지", category: "일식" }],
    });
    global.fetch = mockFetch;

    const onSelect = vi.fn();
    render(<RestaurantAutocomplete onSelect={onSelect} />);

    const input = screen.getByPlaceholderText("음식점 검색...");

    await act(async () => {
      fireEvent.change(input, { target: { value: "카츠" } });
      vi.advanceTimersByTime(500);
      await flushPromises();
    });

    expect(screen.getByText("카츠올로지")).toBeInTheDocument();

    await act(async () => {
      fireEvent.change(input, { target: { value: "" } });
    });

    expect(screen.queryByText("카츠올로지")).not.toBeInTheDocument();
  });
});
