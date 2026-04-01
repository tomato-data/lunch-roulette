"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "투표" },
  { href: "/spinner", label: "룰렛" },
  { href: "/restaurants", label: "식당" },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <header
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "16px 24px",
        background: "var(--color-surface)",
        borderBottom: "1px solid var(--color-border)",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      <h1
        style={{
          margin: 0,
          fontSize: 20,
          fontWeight: 700,
          fontFamily: "var(--font-heading)",
          color: "var(--color-primary)",
        }}
      >
        Lunch Roulette
      </h1>
      <nav style={{ display: "flex", gap: 4 }}>
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              data-active={isActive ? "true" : "false"}
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: isActive ? 600 : 400,
                fontFamily: "var(--font-body)",
                background: isActive
                  ? "var(--color-primary-light)"
                  : "transparent",
                color: isActive
                  ? "var(--color-primary)"
                  : "var(--color-text-muted)",
                textDecoration: "none",
                transition: "background 0.2s, color 0.2s",
              }}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
