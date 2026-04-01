// @vitest-environment jsdom
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi } from "vitest";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "1" }),
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

import RestaurantDetailPage from "@/app/restaurants/[id]/page";

const mockRestaurant = {
  id: 1,
  name: "맛있는 식당",
  category: "한식",
  description: "전통 한식을 맛볼 수 있는 곳입니다.",
  photoPath: null,
  avgRating: 4.3,
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
};

const mockReviews = [
  { id: 1, restaurantId: 1, userId: "u1", nickname: "앨리스", rating: 5, content: "최고에요!", createdAt: "2026-01-01", updatedAt: "2026-01-01" },
  { id: 2, restaurantId: 1, userId: "u2", nickname: "밥", rating: 3, content: null, createdAt: "2026-01-02", updatedAt: "2026-01-02" },
];

function setupFetch(options?: { restaurant?: typeof mockRestaurant; reviews?: typeof mockReviews; avgRating?: number | null; userId?: string }) {
  const restaurant = options?.restaurant ?? mockRestaurant;
  const reviews = options?.reviews ?? mockReviews;
  const avgRating = options?.avgRating ?? mockRestaurant.avgRating;

  global.fetch = vi.fn().mockImplementation((url: string) => {
    if (url.includes("/reviews")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ reviews, avgRating }),
      });
    }
    if (url.includes("/api/restaurants/")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(restaurant),
      });
    }
    return Promise.resolve({ ok: false });
  });

  // mock localStorage for userId
  const userId = options?.userId ?? "u1";
  Object.defineProperty(window, "localStorage", {
    value: {
      getItem: vi.fn((key: string) => {
        if (key === "userId") return userId;
        return null;
      }),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    },
    writable: true,
  });
}

describe("RestaurantDetailPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should render restaurant description", async () => {
    setupFetch();
    render(<RestaurantDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("전통 한식을 맛볼 수 있는 곳입니다.")).toBeDefined();
    });
  });

  it("should render review list with nickname, rating, and content", async () => {
    setupFetch();
    render(<RestaurantDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("앨리스")).toBeDefined();
      expect(screen.getByText("최고에요!")).toBeDefined();
      expect(screen.getByText("밥")).toBeDefined();
    });
  });

  it("should render average rating", async () => {
    setupFetch();
    render(<RestaurantDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("4.3")).toBeDefined();
    });
  });

  it("should render review form with star selection and text input", async () => {
    setupFetch({ userId: "new-user" });
    render(<RestaurantDetailPage />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText("이 식당에 대한 메모를 남겨보세요")).toBeDefined();
      expect(screen.getByText("리뷰 등록")).toBeDefined();
    });
  });

  it("should call API on review submit", async () => {
    setupFetch({ userId: "new-user" });
    render(<RestaurantDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("리뷰 등록")).toBeDefined();
    });

    // click star 4
    const stars = screen.getAllByTestId("star-button");
    fireEvent.click(stars[3]); // 4th star

    // type content
    const textarea = screen.getByPlaceholderText("이 식당에 대한 메모를 남겨보세요");
    fireEvent.change(textarea, { target: { value: "맛있어요" } });

    // submit
    fireEvent.click(screen.getByText("리뷰 등록"));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/reviews"),
        expect.objectContaining({ method: "POST" })
      );
    });
  });

  it("should show edit mode when user has existing review", async () => {
    setupFetch({ userId: "u1" });
    render(<RestaurantDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("리뷰 수정")).toBeDefined();
    });
  });

  it("should call delete API for user's review", async () => {
    setupFetch({ userId: "u1" });
    render(<RestaurantDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("삭제")).toBeDefined();
    });

    fireEvent.click(screen.getByText("삭제"));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/reviews"),
        expect.objectContaining({ method: "DELETE" })
      );
    });
  });
});
