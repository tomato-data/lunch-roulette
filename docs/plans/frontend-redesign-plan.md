# Frontend Redesign TDD Plan

> Botanical Garden 테마 적용 + 실제 회전하는 프리미엄 룰렛 구현 + 전체 UI/UX 개선

**도메인**: Frontend / UI
**생성일**: 2026-04-01
**상태**: COMPLETED
**완료일**: 2026-04-01

---

## 요구사항 요약

1. **theme.json 기반 디자인 시스템**: Botanical Garden 테마(primary: `#4a7c59`, secondary: `#f9a620`, accent: `#b7472a`, background: `#f5f3ed`)를 전체 앱에 일관 적용
2. **프리미엄 룰렛 스피너**: 현재 룰렛은 회전 애니메이션이 없음 (CSS transition은 정의되어 있으나 `transform: rotate()` 값이 적용되지 않음). 자연스러운 물리 기반 감속, 실제 선택된 세그먼트에 정확히 멈추는 애니메이션 구현
3. **전체 UI/UX 개선**: 인라인 스타일 → CSS 모듈 전환, 반응형 레이아웃, 공유 네비게이션, 타이포그래피 시스템

### 현재 핵심 문제점

| 문제 | 위치 | 심각도 |
|------|------|--------|
| 룰렛이 실제로 회전하지 않음 | `spinner-wheel.tsx` - transition 정의만 있고 transform 미적용 | **Critical** |
| useSpinner가 setTimeout으로 결과 표시 | `use-spinner.ts:24` - 회전 각도 계산 없음 | **Critical** |
| theme.json 미사용 | 모든 컴포넌트 - 하드코딩된 색상 | High |
| 인라인 스타일 난무 | 모든 페이지 - 유지보수 불가 | Medium |
| 다크모드 CSS vs 라이트모드 인라인 충돌 | `globals.css` vs 페이지 컴포넌트 | Medium |

---

### Forces Analysis

**변동 식별**: 이 기능에서 무엇이 변하는가? 왜 변하는가?
| 변동 요소 | 변경 주기/이유 | 독립성 |
|----------|--------------|--------|
| 테마 색상/폰트 | 디자인 변경 시 (theme.json 수정) | 독립적 |
| 룰렛 물리 파라미터 (감속, 회전 수) | UX 튜닝 시 | 독립적 |
| 페이지 레이아웃 | 기능 추가 시 | 구조적 |

**패턴 신호 진단**:
| 신호 | 현재 상태 | 판단 |
|------|----------|------|
| 독립적 변동이 3개+ 있는가? | 아니오 (2개) | → 단순 유지 |
| 단계들이 함께 변하는가? | 아니오 | → N/A |
| 순서/개수가 가변인 선택적 단계가 있는가? | 아니오 | → N/A |
| 런타임까지 결정이 불확실한가? | 아니오 | → N/A |
| 조합 중 비즈니스적으로 무효한 세트가 있는가? | 아니오 | → N/A |
| **Force가 아직 없는가?** | 예 | → **단순 유지** |

**결론**: 패턴 불필요. 테마는 CSS 변수로 주입, 룰렛 물리는 hook 파라미터로 관리. 별도 Strategy/Factory 불필요.

---

## 객체 디자인 퀵 레퍼런스

> 프론트엔드 컴포넌트 중심 프로젝트이므로 백엔드 객체 분류 대신 컴포넌트/훅/유틸리티 분류 적용.

### 이 기능의 객체 분류

| 모듈명 | 분류 | 근거 |
|--------|------|------|
| `useSpinner` | Hook (상태 관리) | 룰렛 상태 머신 + 회전 각도 계산. 상태 변경 가능 |
| `calculateSegments` | 순수 함수 (유틸리티) | 입력 → 출력, 부수효과 없음 |
| `pickRandomItem` | 순수 함수 (유틸리티) | 입력 → 출력, 부수효과 없음 |
| `SpinnerWheel` | UI 컴포넌트 | 렌더링 + 사용자 인터랙션 |
| CSS 모듈 (globals.css) | 스타일 토큰 | theme.json → CSS 변수 변환 |

### 디자인 체크포인트

| 단계 | 키워드 체크 | 적용 |
|------|-----------|------|
| **Hook 설계** | 최소 인터페이스? 상태 전이 보호? | useSpinner 반환값에 `targetRotation` 추가 |
| **컴포넌트 설계** | 단일 책임? props 최소화? | SpinnerWheel은 렌더링만, 로직은 hook에 위임 |
| **스타일 설계** | 토큰 기반? 하드코딩 제거? | CSS 변수로 theme.json 값 주입 |

---

## 테스트 전략

### 레이어별 단위 테스트 적합성

| 레이어 | 단위 테스트 적합성 | 이유 |
|--------|-------------------|------|
| **순수 함수** (calculateSegments, pickRandomItem) | 적합 | 입력 → 출력, 외부 의존성 없음 |
| **useSpinner Hook** | 적합 (renderHook) | 상태 머신 로직이 검증 대상 |
| **SpinnerWheel 컴포넌트** | 적합 (RTL) | 렌더링 + 인터랙션 검증 |
| **CSS/스타일** | 부적합 (시각적 검증) | 브라우저에서 수동 확인 |

### 의존성 분류

| 의존성 | 유형 | 테스트 대역 | 검증 방식 |
|--------|------|-----------|----------|
| `Math.random` | 쿼리 | 고정 randomFn 주입 | 반환값 → 각도 검증 |
| `setTimeout` / `onTransitionEnd` | 시스템 경계 | fake timers + fireEvent | 상태 전이 검증 |
| `fetch("/api/restaurants")` | 시스템 경계 | MSW 또는 vi.fn | 데이터 로딩 검증 |

### 생성자 테스트 범위

| 객체 | 실패 테스트 | happy path |
|------|-----------|------------|
| `useSpinner(items)` | 빈 배열 시 spin 무시 (기존 테스트 존재) | 행위 테스트가 암시적 커버 |
| `calculateSegments([])` | 빈 배열 → 빈 결과 (기존 테스트 존재) | 행위 테스트가 암시적 커버 |

### 값 객체 후보 (Primitive Obsession 검토)

해당 없음. 프론트엔드 컴포넌트 중심이며, 원시값 클러스터 없음. (📖 Read: 프론트엔드 프로젝트이므로 ODP VO 규칙 적용 대상 아님)

---

## 기존 테스트 영향 분석

| 변경 유형 | 영향 파일 | 영향 예상 |
|----------|----------|----------|
| `useSpinner` 반환값 변경 (targetRotation 추가) | `__tests__/spinner/use-spinner.test.ts` | 기존 테스트는 targetRotation 미검증이므로 **깨지지 않음**. 새 테스트 추가만 필요 |
| `SpinnerWheel` CSS/마크업 변경 | `__tests__/spinner/spinner-page.test.tsx` | data-testid 유지하면 **깨지지 않음**. 단, transition→onTransitionEnd 변경으로 타이머 기반 테스트 수정 필요 |
| 인라인 스타일 → CSS 모듈 전환 | 기존 테스트 전체 | **영향 없음** (RTL은 구조/텍스트 기반 테스트) |

**결론**: `spinner-page.test.tsx`의 `vi.advanceTimersByTime(3000)` → `fireEvent.transitionEnd` 변경 필요. 나머지 기존 테스트는 안전.

---

## TDD 테스트 계획

### Phase 1: 테마 시스템 (CSS 변수 + 글로벌 스타일)

> theme.json 값을 CSS 커스텀 프로퍼티로 변환하여 globals.css에 적용. 다크모드 제거하고 Botanical Garden 라이트 테마 단일 사용.

**단위 테스트**
- [x] `test_globals_css_defines_theme_variables`: globals.css에 `--color-primary`, `--color-secondary`, `--color-accent`, `--color-background` CSS 변수가 theme.json 값과 일치하는지 확인
- [x] `test_globals_css_defines_font_variables`: `--font-heading`, `--font-body` CSS 변수가 정의되어 있는지 확인
- [x] `test_globals_css_defines_semantic_tokens`: `--color-text`, `--color-text-muted`, `--color-border`, `--color-surface` 등 파생 토큰 정의 확인

**통합 체크** (Phase 완료 시)
- [x] `npm run build` 성공
- [x] 브라우저에서 배경색이 `#f5f3ed` (cream)으로 표시되는지 확인
- [x] 기존 테스트 전체 통과: `npx vitest run`

### Phase 2: 룰렛 물리 엔진 (useSpinner 업그레이드)

> useSpinner hook이 선택된 아이템에 해당하는 **목표 회전 각도**를 계산하고, 누적 회전을 추적. setTimeout 대신 onTransitionEnd 기반 상태 전이.

**단위 테스트**
- [x] `test_spin_returns_target_rotation`: `spin()` 호출 시 `targetRotation` 값이 0보다 큰 수를 반환
- [x] `test_target_rotation_includes_multiple_full_spins`: targetRotation이 최소 5바퀴(1800도) 이상
- [x] `test_target_rotation_lands_on_selected_segment`: 선택된 아이템 인덱스에 해당하는 세그먼트 중앙에 포인터가 정지하도록 각도 계산 검증 (포인터는 상단 = 0도)
- [x] `test_cumulative_rotation_increases_each_spin`: 두 번째 spin의 targetRotation이 첫 번째보다 큼 (누적)
- [x] `test_on_spin_end_transitions_to_result`: `onSpinEnd()` 콜백 호출 시 state가 "spinning" → "result"로 전이
- [x] `test_reset_preserves_cumulative_rotation`: reset 후 재spin 시 이전 누적 각도에서 이어서 회전

**통합 체크** (Phase 완료 시)
- [x] 기존 useSpinner 테스트 (`__tests__/spinner/use-spinner.test.ts`) 통과 (하위 호환)
- [x] `npx vitest run` 전체 통과

### Phase 3: 룰렛 휠 컴포넌트 (SpinnerWheel 리디자인)

> SVG 기반 휠에 실제 CSS transform 회전 적용. Botanical Garden 테마 색상. 포인터 애니메이션. 센터 허브. 드롭 섀도우.

**단위 테스트**
- [x] `test_wheel_applies_rotation_transform_on_spin`: spin 후 wheel 요소에 `transform: rotate(Xdeg)` 스타일이 적용되는지 확인
- [x] `test_wheel_transition_uses_proper_easing`: spinning 상태에서 transition이 `cubic-bezier` ease-out 곡선을 사용하는지 확인
- [x] `test_wheel_fires_transition_end_to_show_result`: transitionEnd 이벤트 발생 시 결과가 표시되는지 확인 (기존 setTimeout 제거)
- [x] `test_wheel_segments_use_theme_colors`: 세그먼트 색상이 Botanical Garden 팔레트 기반인지 확인
- [x] `test_wheel_renders_center_hub`: 휠 중앙에 장식 원(center hub)이 렌더링되는지 확인
- [x] `test_result_display_uses_theme_styling`: 결과 표시 영역이 테마 색상을 사용하는지 확인
- [x] `test_empty_state_message_with_theme`: 빈 상태 메시지가 테마에 맞게 표시되는지 확인

**통합 체크** (Phase 완료 시)
- [x] 기존 SpinnerWheel 테스트 수정 후 통과 (`__tests__/spinner/spinner-page.test.tsx` - `advanceTimersByTime` → `fireEvent.transitionEnd`)
- [x] 브라우저에서 룰렛 클릭 시 실제로 회전 후 정확한 세그먼트에 멈추는지 확인
- [x] 두 번째 spin이 첫 번째 멈춘 위치에서 이어서 회전하는지 확인
- [x] `npx vitest run` 전체 통과

### Phase 4: 공유 레이아웃 & 네비게이션

> 공통 헤더/네비게이션을 layout 또는 공유 컴포넌트로 추출. 페이지별 중복 네비게이션 코드 제거.

**단위 테스트**
- [x] `test_navigation_renders_all_links`: 네비게이션에 홈, 룰렛, 식당관리 링크가 모두 존재
- [x] `test_navigation_highlights_current_page`: 현재 페이지에 해당하는 링크에 활성 스타일 적용
- [x] `test_navigation_uses_theme_colors`: 네비게이션 색상이 테마 변수 사용

**통합 체크** (Phase 완료 시)
- [x] 각 페이지(`/`, `/spinner`, `/restaurants`)에서 네비게이션이 일관되게 표시
- [x] 네비게이션 링크 클릭으로 페이지 전환 확인
- [x] `npx vitest run` 전체 통과

### Phase 5: 홈 페이지 (투표) 리디자인

> 로그인 화면 + 투표 세션 UI를 Botanical Garden 테마로 전면 리디자인. 인라인 스타일 → CSS 모듈.

**단위 테스트**
- [x] `test_login_screen_uses_theme_styling`: 로그인 화면이 테마 배경색/폰트 사용
- [x] `test_session_list_uses_theme_card_style`: 세션 목록이 카드 형태로 테마 색상 적용
- [x] `test_vote_button_uses_accent_color`: 투표 버튼이 테마 accent 색상 사용
- [x] `test_active_session_highlight_uses_secondary_color`: 선택된 세션에 secondary 색상 하이라이트

**통합 체크** (Phase 완료 시)
- [x] 로그인 → 세션 선택 → 투표 전체 플로우가 동작
- [x] 반응형: 모바일(400px), 태블릿(768px), 데스크톱(1024px) 레이아웃 확인
- [x] `npx vitest run` 전체 통과

### Phase 6: 식당 관리 페이지 리디자인

> 식당 목록(CRUD) UI를 Botanical Garden 테마로 전면 리디자인. 카드 그리드 개선. avgRating 별점 표시 테마 적용.

**단위 테스트**
- [x] `test_restaurant_card_uses_theme_styling`: 카드가 테마 border/shadow 스타일 사용
- [x] `test_add_button_uses_primary_color`: 추가 버튼이 primary 색상 사용
- [x] `test_category_badge_uses_secondary_color`: 카테고리 뱃지가 secondary 색상 사용
- [x] `test_form_inputs_use_theme_border`: 폼 입력 필드가 테마 border 색상 사용
- [x] `test_avg_rating_stars_use_theme_secondary`: 카드의 평균 별점이 secondary(Marigold) 색상 사용
- [x] `test_restaurant_name_links_to_detail`: 식당 이름 클릭 시 `/restaurants/[id]` 상세 페이지로 이동

**통합 체크** (Phase 완료 시)
- [x] 식당 추가 → 수정 → 삭제 전체 CRUD 플로우 동작
- [x] 사진 업로드 + 미리보기 동작
- [x] 식당 카드에서 avgRating 표시 확인
- [x] `npx vitest run` 전체 통과

### Phase 7: 식당 상세 페이지 & 리뷰 리디자인

> `/restaurants/[id]` 상세 페이지를 Botanical Garden 테마로 리디자인. 리뷰 작성 폼, 별점 입력, 리뷰 목록 UI 개선.

**단위 테스트**
- [x] `test_detail_page_header_uses_theme_styling`: 식당 이름/카테고리가 테마 색상 적용
- [x] `test_star_rating_input_uses_theme_secondary`: 별점 입력 버튼이 secondary(Marigold) 색상 사용
- [x] `test_review_form_uses_theme_surface`: 리뷰 작성 폼이 surface 배경 + 테마 border 사용
- [x] `test_review_card_uses_theme_styling`: 개별 리뷰 카드가 테마 border/radius 적용
- [x] `test_submit_button_uses_primary_color`: 리뷰 등록 버튼이 primary 색상 사용
- [x] `test_delete_button_uses_accent_color`: 삭제 버튼이 accent(Terracotta) 색상 사용
- [x] `test_back_link_uses_theme_color`: "← 식당 목록" 링크가 테마 text-muted 색상 사용

**통합 체크** (Phase 완료 시)
- [x] 식당 목록 → 상세 페이지 진입 → 리뷰 작성 → 별점 표시 전체 플로우 동작
- [x] 리뷰 수정/삭제 플로우 동작
- [x] 평균 별점이 리뷰 변경 시 업데이트 확인
- [x] `npx vitest run` 전체 통과

### Phase 8: 스피너 페이지 최종 통합 & 폴리시

> 스피너 페이지 전체 레이아웃 리디자인. 룰렛 + 결과 표시 + 네비게이션 최종 통합.

**단위 테스트**
- [x] `test_spinner_page_loading_state_themed`: 로딩 스피너가 테마 primary 색상 사용
- [x] `test_spinner_page_integrates_themed_wheel`: SpinnerWheel이 테마 적용된 상태로 렌더링
- [x] `test_result_celebration_animation`: 결과 표시 시 축하 애니메이션/트랜지션 존재

**통합 체크** (Phase 완료 시)
- [x] 전체 앱 플로우: 로그인 → 식당 추가 → 리뷰 작성 → 룰렛 돌리기 → 결과 확인
- [x] 모든 페이지에서 Botanical Garden 테마 일관 적용 확인
- [x] `npm run build` 프로덕션 빌드 성공
- [x] `npx vitest run` 전체 테스트 통과

### Phase 9: Feature Documentation

> 구현 완료 후 `docs/features/` 문서를 생성 또는 업데이트한다.

- [x] 기능 문서 생성 또는 업데이트 (`docs/features/frontend/design-system.md`)
- [x] `docs/features/index.md`에 누락된 항목 추가

---

## 진행 상황

| Phase | 단위 | 통합 | 전체 | 진행률 |
|-------|------|------|------|--------|
| Phase 1: 테마 시스템 | 3/3 | 3/3 | 6/6 | 100% |
| Phase 2: 룰렛 물리 엔진 | 6/6 | 2/2 | 8/8 | 100% |
| Phase 3: 룰렛 휠 컴포넌트 | 7/7 | 4/4 | 11/11 | 100% |
| Phase 4: 공유 레이아웃 | 3/3 | 3/3 | 6/6 | 100% |
| Phase 5: 홈 페이지 | 4/4 | 3/3 | 7/7 | 100% |
| Phase 6: 식당 관리 | 6/6 | 4/4 | 10/10 | 100% |
| Phase 7: 식당 상세/리뷰 | 7/7 | 4/4 | 11/11 | 100% |
| Phase 8: 스피너 통합 | 3/3 | 4/4 | 7/7 | 100% |
| Phase 9: 문서화 | 0/0 | 2/2 | 2/2 | 100% |

---

## 관련 파일

**소스 코드**
- `app/globals.css` — 글로벌 스타일, CSS 변수 정의
- `app/layout.tsx` — 루트 레이아웃, 폰트 로딩
- `app/page.tsx` — 홈 페이지 (투표)
- `app/spinner/page.tsx` — 스피너 페이지
- `app/spinner/spinner-wheel.tsx` — 룰렛 휠 컴포넌트
- `app/restaurants/page.tsx` — 식당 목록 페이지 (CRUD + avgRating 표시)
- `app/restaurants/[id]/page.tsx` — 식당 상세 페이지 (리뷰/평점)
- `lib/spinner/use-spinner.ts` — 스피너 상태 hook
- `lib/spinner/pick-random-item.ts` — 세그먼트 계산 유틸리티
- `lib/domain/rating.ts` — Rating 값 객체
- `lib/service/review-service.ts` — 리뷰 비즈니스 로직
- `theme.json` — Botanical Garden 테마 정의

**테스트**
- `__tests__/spinner/use-spinner.test.ts` — useSpinner hook 테스트
- `__tests__/spinner/spinner-page.test.tsx` — SpinnerWheel 컴포넌트 테스트
- `__tests__/spinner/pick-random-item.test.ts` — 유틸리티 테스트
- `__tests__/domain/rating.test.ts` — Rating 값 객체 테스트
- `__tests__/service/review-service.test.ts` — 리뷰 서비스 테스트
- `__tests__/api/reviews.test.ts` — 리뷰 API 통합 테스트

---

## 기술 참고사항

### 룰렛 회전 구현 상세

**목표 각도 계산**:
```
segmentAngle = 360 / items.length
targetSegmentCenter = selectedIndex * segmentAngle + segmentAngle / 2
baseAngle = 360 - targetSegmentCenter  // 포인터(상단)에 세그먼트 정렬
extraSpins = 5 + Math.floor(Math.random() * 3)  // 5~7바퀴
totalRotation = cumulativeRotation + baseAngle + 360 * extraSpins
```

**CSS 이징 곡선**: `cubic-bezier(0.440, -0.205, 0.000, 1.130)`
- 두 번째 제어점의 음수 Y: 시작 시 살짝 뒤로 당기는 효과 (flick)
- 네 번째 제어점의 1.0 초과: 미세한 바운스/정착 효과
- 지속시간: 4초

**상태 전이**: `onTransitionEnd` 이벤트 기반 (setTimeout 제거)

### 테마 색상 파생 토큰

```css
--color-primary: #4a7c59;      /* Fern Green */
--color-secondary: #f9a620;    /* Marigold */
--color-accent: #b7472a;       /* Terracotta */
--color-background: #f5f3ed;   /* Cream */

/* 파생 토큰 */
--color-text: #2d3a2e;         /* primary 기반 어둡게 */
--color-text-muted: #7a8a7c;   /* primary 기반 밝게 */
--color-surface: #ffffff;       /* 카드/폼 배경 */
--color-border: #d9d4cb;       /* background 기반 어둡게 */
--color-primary-light: #e8f0ea; /* primary 10% 배경 */
--color-secondary-light: #fef5e0; /* secondary 10% 배경 */
--color-accent-light: #fceae5; /* accent 10% 배경 */
```

### 룰렛 세그먼트 컬러 팔레트

Botanical Garden 테마 기반 12색 팔레트:
```
#4a7c59 (Fern Green), #f9a620 (Marigold), #b7472a (Terracotta),
#6b9e7a (Sage), #e8883a (Amber), #d4654a (Clay),
#3d6b4a (Forest), #c7870e (Honey), #8b5e3c (Chestnut),
#7fb38e (Mint), #f0b84d (Gold), #c95d45 (Rust)
```

---

## 커밋 히스토리

| 커밋 타입 | 설명 | 날짜 |
|-----------|------|------|
| [BEHAVIORAL] | | |
| [STRUCTURAL] | | |

---

## 메모

- 기존 테스트 중 `__tests__/spinner/spinner-page.test.tsx`의 `vi.advanceTimersByTime(3000)` 패턴이 Phase 3에서 `fireEvent.transitionEnd` 로 변경 필요
- Next.js App Router 사용 중이므로 CSS 모듈 또는 globals.css 기반 접근 유지 (별도 CSS-in-JS 라이브러리 도입 불필요)
- DejaVu 폰트는 웹에서 기본 제공되지 않으므로, 시각적으로 유사한 Google Fonts 대안 고려 (Noto Serif + Noto Sans 등)
- 현재 `page.module.css`가 생성되어 있으나 미사용 — Phase 1에서 삭제 또는 활용 결정
