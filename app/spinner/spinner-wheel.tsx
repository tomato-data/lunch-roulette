"use client";

import { useSpinner } from "@/lib/spinner/use-spinner";
import { calculateSegments } from "@/lib/spinner/pick-random-item";

interface SpinnerItem {
  id: number;
  name: string;
  category?: string | null;
}

interface SpinnerWheelProps {
  items: SpinnerItem[];
}

const SEGMENT_COLORS = [
  "#4a7c59", "#f9a620", "#b7472a",
  "#6b9e7a", "#e8883a", "#d4654a",
  "#3d6b4a", "#c7870e", "#8b5e3c",
  "#7fb38e", "#f0b84d", "#c95d45",
];

export default function SpinnerWheel({ items }: SpinnerWheelProps) {
  const { state, selectedItem, targetRotation, spin, reset, onSpinEnd } =
    useSpinner(items);
  const segments = calculateSegments(items);

  if (items.length === 0) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: 60,
          color: "var(--color-text-muted)",
          background: "var(--color-surface)",
          borderRadius: 16,
          border: "2px dashed var(--color-border)",
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 12 }}>🍽️</div>
        <div style={{ fontSize: 16 }}>등록된 식당이 없습니다.</div>
        <div style={{ fontSize: 14, marginTop: 4 }}>먼저 식당을 추가해주세요!</div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 32,
      }}
    >
      {/* Wheel container */}
      <div style={{ position: "relative", width: 340, height: 340 }}>
        {/* Pointer triangle */}
        <div
          data-testid="pointer"
          style={{
            position: "absolute",
            top: -6,
            left: "50%",
            transform: "translateX(-50%)",
            width: 0,
            height: 0,
            borderLeft: "14px solid transparent",
            borderRight: "14px solid transparent",
            borderTop: "24px solid var(--color-accent, #b7472a)",
            zIndex: 10,
            filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))",
          }}
        />

        {/* Spinning disc */}
        <div
          data-testid="wheel"
          onTransitionEnd={onSpinEnd}
          style={{
            width: 340,
            height: 340,
            borderRadius: "50%",
            overflow: "hidden",
            position: "relative",
            border: "6px solid var(--color-primary, #4a7c59)",
            boxShadow:
              "0 8px 32px rgba(74, 124, 89, 0.25), inset 0 0 0 3px rgba(255,255,255,0.3)",
            transition:
              state === "spinning"
                ? "transform 4s cubic-bezier(0.440, -0.205, 0.000, 1.130)"
                : "none",
            transform: `rotate(${targetRotation}deg)`,
          }}
        >
          <svg viewBox="0 0 340 340" width="340" height="340">
            {segments.map((seg, i) => {
              const cx = 170,
                cy = 170,
                r = 170;
              const startRad = ((seg.startAngle - 90) * Math.PI) / 180;
              const endRad =
                ((seg.startAngle + seg.angle - 90) * Math.PI) / 180;
              const x1 = cx + r * Math.cos(startRad);
              const y1 = cy + r * Math.sin(startRad);
              const x2 = cx + r * Math.cos(endRad);
              const y2 = cy + r * Math.sin(endRad);
              const largeArc = seg.angle > 180 ? 1 : 0;
              const d = `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${largeArc},1 ${x2},${y2} Z`;

              const midRad =
                ((seg.startAngle + seg.angle / 2 - 90) * Math.PI) / 180;
              const textX = cx + r * 0.62 * Math.cos(midRad);
              const textY = cy + r * 0.62 * Math.sin(midRad);
              const textAngle = seg.startAngle + seg.angle / 2;

              return (
                <g key={i}>
                  <path
                    d={d}
                    fill={SEGMENT_COLORS[i % SEGMENT_COLORS.length]}
                    stroke="rgba(255,255,255,0.3)"
                    strokeWidth="1"
                  />
                  <text
                    x={textX}
                    y={textY}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    transform={`rotate(${textAngle}, ${textX}, ${textY})`}
                    fill="#fff"
                    fontSize={items.length > 8 ? 10 : 13}
                    fontWeight="bold"
                    style={{
                      textShadow: "1px 1px 3px rgba(0,0,0,0.6)",
                      fontFamily: "var(--font-body)",
                    }}
                  >
                    {seg.item.name}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Center hub */}
          <div
            data-testid="center-hub"
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: 44,
              height: 44,
              borderRadius: "50%",
              background:
                "radial-gradient(circle, var(--color-surface, #fff) 40%, var(--color-border, #d9d4cb) 100%)",
              border: "3px solid var(--color-primary, #4a7c59)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            }}
          />
        </div>
      </div>

      {/* Controls */}
      <button
        onClick={state === "result" ? reset : spin}
        disabled={state === "spinning"}
        style={{
          padding: "14px 40px",
          fontSize: 18,
          fontWeight: "bold",
          fontFamily: "var(--font-heading)",
          background:
            state === "spinning"
              ? "var(--color-border)"
              : state === "result"
                ? "var(--color-secondary, #f9a620)"
                : "var(--color-primary, #4a7c59)",
          color: state === "result" ? "var(--color-text)" : "#fff",
          border: "none",
          borderRadius: 12,
          cursor: state === "spinning" ? "not-allowed" : "pointer",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          transition: "background 0.3s, transform 0.1s",
          letterSpacing: "0.5px",
        }}
      >
        {state === "spinning"
          ? "돌리는 중..."
          : state === "result"
            ? "다시 돌리기"
            : "돌리기!"}
      </button>

      {/* Result */}
      {state === "result" && selectedItem && (
        <div
          data-testid="result"
          style={{
            padding: 24,
            background: "var(--color-secondary-light, #fef5e0)",
            border: "2px solid var(--color-secondary, #f9a620)",
            borderRadius: 16,
            textAlign: "center",
            boxShadow: "0 4px 16px rgba(249, 166, 32, 0.2)",
            animation: "fadeInUp 0.4s ease-out",
          }}
        >
          <div
            style={{
              fontSize: 14,
              color: "var(--color-text-muted)",
              fontFamily: "var(--font-body)",
            }}
          >
            오늘의 점심은
          </div>
          <div
            style={{
              fontSize: 32,
              fontWeight: "bold",
              marginTop: 6,
              color: "var(--color-primary, #4a7c59)",
              fontFamily: "var(--font-heading)",
            }}
          >
            {selectedItem.name}
          </div>
          {selectedItem.category && (
            <div
              style={{
                display: "inline-block",
                marginTop: 8,
                padding: "4px 12px",
                background: "var(--color-primary-light, #e8f0ea)",
                color: "var(--color-primary, #4a7c59)",
                borderRadius: 20,
                fontSize: 13,
                fontFamily: "var(--font-body)",
              }}
            >
              {selectedItem.category}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
