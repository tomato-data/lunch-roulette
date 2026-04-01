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

const COLORS = [
  "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4",
  "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F",
  "#BB8FCE", "#85C1E9", "#F8C471", "#82E0AA",
];

export default function SpinnerWheel({ items }: SpinnerWheelProps) {
  const { state, selectedItem, spin, reset } = useSpinner(items);
  const segments = calculateSegments(items);

  if (items.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}>
        등록된 식당이 없습니다. 먼저 식당을 추가해주세요!
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
      {/* Wheel */}
      <div style={{ position: "relative", width: 320, height: 320 }}>
        {/* Pointer */}
        <div
          style={{
            position: "absolute",
            top: -12,
            left: "50%",
            transform: "translateX(-50%)",
            width: 0,
            height: 0,
            borderLeft: "12px solid transparent",
            borderRight: "12px solid transparent",
            borderTop: "20px solid #333",
            zIndex: 10,
          }}
        />
        {/* Spinning disc */}
        <div
          data-testid="wheel"
          style={{
            width: 320,
            height: 320,
            borderRadius: "50%",
            overflow: "hidden",
            position: "relative",
            border: "4px solid #333",
            transition: state === "spinning" ? "transform 3s cubic-bezier(0.17, 0.67, 0.12, 0.99)" : "none",
          }}
        >
          <svg viewBox="0 0 320 320" width="320" height="320">
            {segments.map((seg, i) => {
              const startRad = ((seg.startAngle - 90) * Math.PI) / 180;
              const endRad = ((seg.startAngle + seg.angle - 90) * Math.PI) / 180;
              const cx = 160, cy = 160, r = 160;
              const x1 = cx + r * Math.cos(startRad);
              const y1 = cy + r * Math.sin(startRad);
              const x2 = cx + r * Math.cos(endRad);
              const y2 = cy + r * Math.sin(endRad);
              const largeArc = seg.angle > 180 ? 1 : 0;
              const d = `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${largeArc},1 ${x2},${y2} Z`;

              const midRad = ((seg.startAngle + seg.angle / 2 - 90) * Math.PI) / 180;
              const textX = cx + r * 0.6 * Math.cos(midRad);
              const textY = cy + r * 0.6 * Math.sin(midRad);
              const textAngle = seg.startAngle + seg.angle / 2;

              return (
                <g key={i}>
                  <path d={d} fill={COLORS[i % COLORS.length]} />
                  <text
                    x={textX}
                    y={textY}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    transform={`rotate(${textAngle}, ${textX}, ${textY})`}
                    fill="#fff"
                    fontSize={items.length > 8 ? 10 : 13}
                    fontWeight="bold"
                    style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.5)" }}
                  >
                    {seg.item.name}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Controls */}
      <button
        onClick={state === "result" ? reset : spin}
        disabled={state === "spinning"}
        style={{
          padding: "12px 32px",
          fontSize: 18,
          fontWeight: "bold",
          background: state === "spinning" ? "#d1d5db" : state === "result" ? "#10b981" : "#3b82f6",
          color: "white",
          border: "none",
          borderRadius: 8,
          cursor: state === "spinning" ? "not-allowed" : "pointer",
        }}
      >
        {state === "spinning" ? "돌리는 중..." : state === "result" ? "다시 돌리기" : "돌리기!"}
      </button>

      {/* Result */}
      {state === "result" && selectedItem && (
        <div
          data-testid="result"
          style={{
            padding: 20,
            background: "#f0fdf4",
            border: "2px solid #10b981",
            borderRadius: 12,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 14, color: "#6b7280" }}>오늘의 점심은</div>
          <div style={{ fontSize: 28, fontWeight: "bold", marginTop: 4 }}>
            {selectedItem.name}
          </div>
          {selectedItem.category && (
            <div style={{ fontSize: 14, color: "#10b981", marginTop: 4 }}>
              {selectedItem.category}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
