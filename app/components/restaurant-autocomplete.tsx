"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface Restaurant {
  id: number;
  name: string;
  category: string | null;
}

interface RestaurantAutocompleteProps {
  onSelect: (restaurant: Restaurant) => void;
}

export default function RestaurantAutocomplete({ onSelect }: RestaurantAutocompleteProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Restaurant[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    const res = await fetch(`/api/restaurants/search?q=${encodeURIComponent(q)}`);
    if (res.ok) {
      const data = await res.json();
      setResults(data);
      setIsOpen(data.length > 0);
    }
  }, []);

  function handleChange(value: string) {
    setQuery(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!value.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    timerRef.current = setTimeout(() => search(value), 500);
  }

  function handleSelect(restaurant: Restaurant) {
    onSelect(restaurant);
    setQuery("");
    setResults([]);
    setIsOpen(false);
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div style={{ position: "relative" }}>
      <input
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="음식점 검색..."
        style={{
          width: "100%",
          padding: "10px 14px",
          border: "1px solid var(--color-border)",
          borderRadius: 8,
          fontSize: 14,
          background: "var(--color-background)",
          color: "var(--color-text)",
          fontFamily: "var(--font-body)",
          outline: "none",
          boxSizing: "border-box",
        }}
      />
      {isOpen && results.length > 0 && (
        <ul
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: 8,
            marginTop: 4,
            padding: 0,
            listStyle: "none",
            zIndex: 10,
            maxHeight: 200,
            overflowY: "auto",
          }}
        >
          {results.map((r) => (
            <li
              key={r.id}
              onClick={() => handleSelect(r)}
              style={{
                padding: "10px 14px",
                cursor: "pointer",
                fontSize: 14,
                fontFamily: "var(--font-body)",
                borderBottom: "1px solid var(--color-border)",
              }}
            >
              <span style={{ fontWeight: 500, color: "var(--color-text)" }}>{r.name}</span>
              {r.category && (
                <span style={{ marginLeft: 8, fontSize: 12, color: "var(--color-text-muted)" }}>
                  {r.category}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
