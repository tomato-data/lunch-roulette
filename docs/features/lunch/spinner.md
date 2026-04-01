# 점심 룰렛 (Lunch Spinner)

> 등록된 식당 중 하나를 돌림판(룰렛)으로 랜덤 선택하는 기능

## 개요

식당 목록을 시각적인 돌림판(wheel)으로 표시하고, 스핀 버튼을 눌러 랜덤으로 점심 식당을 선택한다.

## 페이지

- **URL**: `/spinner`
- **데이터 소스**: `GET /api/restaurants` (기존 식당 CRUD API)

## 주요 기능

1. **돌림판 시각화** — SVG 기반 원형 휠, 식당별 색상 세그먼트
2. **랜덤 선택** — 스핀 버튼 클릭 시 3초간 회전 후 결과 표시
3. **결과 표시** — 선택된 식당 이름 + 카테고리 강조 표시
4. **빈 상태 처리** — 식당 미등록 시 안내 메시지

## 파일 구조

```
lib/spinner/
├── pick-random-item.ts    # 순수 함수: pickRandomItem, calculateSegments
└── use-spinner.ts         # React hook: 스핀 상태 관리 (idle → spinning → result)

app/spinner/
├── page.tsx               # 페이지: 식당 데이터 fetch + SpinnerWheel 렌더링
└── spinner-wheel.tsx      # 컴포넌트: 돌림판 UI + 결과 표시
```

## 네비게이션

- 메인 페이지 → 룰렛 페이지 (헤더 링크)
- 룰렛 페이지 → 투표 페이지, 식당 관리 페이지 (헤더 링크)
