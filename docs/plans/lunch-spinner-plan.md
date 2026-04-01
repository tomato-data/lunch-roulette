# Lunch Spinner TDD Plan

> 등록된 식당 목록을 돌림판(룰렛 휠)으로 표시하고, 랜덤으로 하나를 선택하는 기능

**도메인**: lunch
**생성일**: 2026-04-01
**상태**: COMPLETED
**완료일**: 2026-04-01

---

## 요구사항 요약

1. 등록된 식당 목록(`GET /api/restaurants`)을 돌림판(wheel) 형태로 시각화
2. 스핀 버튼을 누르면 돌림판이 회전하며 랜덤 식당 선택
3. 선택된 식당을 강조 표시
4. 식당이 없거나 1개일 때 적절한 빈 상태 처리

### Forces Analysis

**변동 식별**:

| 변동 요소 | 변경 주기/이유 | 독립성 |
|----------|--------------|--------|
| 식당 목록 | 외부 API에서 fetch, 사용자가 CRUD | 독립 (props/fetch로 주입) |
| 스핀 애니메이션 | UI 개선 시 | 독립 (CSS transition) |
| 랜덤 선택 알고리즘 | 변경 가능성 극히 낮음 | 없음 |

**패턴 신호 진단**:

| 신호 | 현재 상태 | 판단 |
|------|----------|------|
| 독립적 변동이 3개+ 있는가? | 아니오 | → 해당 없음 |
| 단계들이 함께 변하는가? | 아니오 | → 해당 없음 |
| 순서/개수가 가변인 선택적 단계가 있는가? | 아니오 | → 해당 없음 |
| 런타임까지 결정이 불확실한가? | 아니오 | → 해당 없음 |
| 조합 중 비즈니스적으로 무효한 세트가 있는가? | 아니오 | → 해당 없음 |
| **Force가 아직 없는가?** | 예 | → **단순 유지** |

**결론**: 패턴 불필요 — 단순 유지. 돌림판은 "목록에서 랜덤 하나 선택 + 시각적 애니메이션"이므로 복잡한 패턴 불필요.

---

## 객체 디자인 퀵 레퍼런스

> 이 섹션은 TDD 사이클에서 객체 디자인 원칙을 참조하기 위한 것입니다.
> `/tdd-plan` 실행 시 자동 작성됩니다.

### 객체 분류 기준

| 분류             | 특성                             | 불변성       | 예시                                 |
| ---------------- | -------------------------------- | ------------ | ------------------------------------ |
| **서비스**       | 무상태, 의존성 주입, 행위 중심   | 생성 후 불변 | `UserService`, `PaymentGateway`      |
| **개체(Entity)** | 식별자, 상태 변경, 도메인 이벤트 | 변경 가능    | `Order`, `User`, `Player`            |
| **값 객체**      | 값 = 식별자, frozen, 복사 수정   | 불변         | `Money`, `EmailAddress`, `DateRange` |
| **DTO**          | 경계 객체, 공개 속성, 규칙 예외  | 불변         | `CreateOrderRequest`, `StockReport`  |

### 이 기능의 객체 분류

| 클래스명 | 분류 | 근거 |
|---------|------|------|
| `pickRandomItem()` | 서비스 (순수 함수) | 무상태, 입력→출력, 랜덤 선택 행위 |
| `calculateSegments()` | 서비스 (순수 함수) | 무상태, 휠 세그먼트 각도 계산 |
| `useSpinner` hook | 서비스 (React hook) | 상태 관리, spin/reset 행위 중심 |
| `SpinnerWheel` component | DTO (View) | 경계 객체, 시각적 표현 담당 |

### 디자인 체크포인트

| 단계 | 키워드 체크 | 참조 규칙 |
|------|------------|----------|
| **생성** | items를 props로 주입, 최소 데이터 | `obj-require-minimum-data` |
| **변경** | 스핀 상태는 hook 내부에서만 관리 | `mut-immutable-first` |
| **메서드** | spin()은 명령, selectedItem은 쿼리 | `method-cqs-separation` |
| **테스트** | Math.random → randomFn 주입으로 결정적 테스트 | `test-stub-for-query` |

---

## TDD 테스트 계획

### 테스트 전략

**레이어별 단위 테스트 적합성**:

| 레이어 | 단위 테스트 적합성 | 이유 |
|--------|-------------------|------|
| **스핀 로직 (순수 함수)** | 적합 | 입력→출력, 외부 의존성 없음 |
| **useSpinner (hook)** | 적합 (renderHook) | 상태 전이 로직 검증 |
| **SpinnerWheel (component)** | 적합 (render) | DOM 구조 + 이벤트 핸들링 |
| **데이터 fetch (API 호출)** | 부적합 (통합 체크) | 실제 API 없이는 mock tautology |

**의존성 분류**:

| 의존성 | 유형 | 테스트 대역 | 검증 방식 |
|--------|------|-----------|----------|
| `Math.random()` | 시스템 경계 | `randomFn` 파라미터 주입 | 결정적 결과 검증 |
| 식당 목록 (items) | 쿼리 | props로 직접 전달 | 반환값 → 결과 검증 |
| `onComplete` 콜백 | 명령 | 스파이 (vi.fn()) | 호출 여부·인자 검증 |

**생성자 테스트 범위**:

| 객체 | 실패 테스트 | happy path |
|------|-----------|------------|
| `pickRandomItem` | 빈 배열 전달 시 에러 | 행위 테스트가 암시적 커버 |

**상태 변경 검증 방식**:

| 개체 | 변경자 | 검증 방식 |
|------|--------|----------|
| useSpinner | `spin()` | `state === 'spinning'` |
| useSpinner | (애니메이션 완료) | `state === 'result'`, `selectedItem` 설정됨 |
| useSpinner | `reset()` | `state === 'idle'`, `selectedItem === null` |

### 값 객체 후보 (Primitive Obsession 검토)

해당 없음 — 이 기능은 기존 `Restaurant` 인터페이스를 그대로 사용하며, 새로운 원시값 클러스터가 없음. 스핀 결과도 `Restaurant` 객체 자체를 반환하므로 별도 VO 불필요.

(📖 Read: obj-extract-value-object.md — 파일 미존재 확인 완료)

### 기존 테스트 영향 분석

해당 없음 — 기존 코드를 변경하지 않음. 새 페이지/컴포넌트 추가만 해당.

---

### Phase 1: 스핀 선택 로직 (순수 함수)

**단위 테스트**

- [x] `test_pick_random_item_returns_item_from_list`: 주어진 목록에서 항목 하나를 반환
- [x] `test_pick_random_item_with_custom_random_returns_deterministic_result`: randomFn 주입 시 예측 가능한 결과
- [x] `test_pick_random_item_throws_when_empty_list`: 빈 목록이면 에러
- [x] `test_calculate_segments_divides_circle_equally`: N개 항목이면 각 세그먼트 = 360/N도
- [x] `test_calculate_segments_returns_empty_for_empty_list`: 빈 목록이면 빈 배열

**통합 체크** (Phase 완료 시)

- [x] `pickRandomItem`, `calculateSegments`가 export되어 hook에서 import 가능

### Phase 2: useSpinner Hook (상태 관리)

> 사전 준비: `@testing-library/react`, `@testing-library/jest-dom` 설치 필요 (renderHook 사용)

**단위 테스트**

- [x] `test_initial_state_is_idle_with_no_selection`: 초기 상태 `{ state: 'idle', selectedItem: null }`
- [x] `test_spin_transitions_to_spinning`: `spin()` 호출 시 `state === 'spinning'`
- [x] `test_spin_ignored_when_already_spinning`: spinning 중 `spin()` 재호출 무시
- [x] `test_spin_ignored_when_items_empty`: items가 빈 배열이면 spin() 무시
- [x] `test_spin_completes_with_selected_item`: 애니메이션 완료 후 `state === 'result'` + `selectedItem` 설정
- [x] `test_reset_returns_to_idle`: `reset()` 후 초기 상태로 복귀

**통합 체크** (Phase 완료 시)

- [x] hook이 Phase 1의 `pickRandomItem`을 실제로 사용하는지 import 확인
- [x] hook이 컴포넌트에서 사용 가능한 인터페이스를 제공하는지 확인

### Phase 3: Spinner 페이지 (UI + 데이터 통합)

**단위 테스트**

- [x] `test_renders_all_restaurant_names_on_wheel`: 모든 식당 이름이 휠에 표시됨
- [x] `test_renders_spin_button`: 스핀 버튼이 렌더링됨
- [x] `test_spin_button_click_triggers_spinning_state`: 버튼 클릭 시 spinning 상태
- [x] `test_displays_result_after_spin_completes`: 스핀 완료 후 선택된 식당 표시
- [x] `test_spin_button_disabled_during_spinning`: 스핀 중 버튼 비활성화
- [x] `test_shows_empty_message_when_no_restaurants`: 식당 없을 때 안내 메시지

**통합 체크** (Phase 완료 시)

- [x] `/spinner` 페이지가 `GET /api/restaurants`에서 데이터를 fetch하는지 확인
- [x] 브라우저에서 `/spinner` 접근 시 돌림판이 렌더링되는지 확인
- [x] 메인 페이지(`app/page.tsx`)에서 `/spinner`로의 네비게이션 링크 존재 확인

### Phase 4: Feature Documentation

> 구현 완료 후 `docs/features/` 문서를 생성 또는 업데이트한다.

- [x] 기능 문서 생성 또는 업데이트 (`docs/features/lunch/spinner.md`)
- [x] `docs/features/index.md`에 누락된 항목 추가

---

## 진행 상황

| Phase | 단위 | 통합 | 전체 | 진행률 |
|-------|------|------|------|--------|
| Phase 1: 스핀 선택 로직 | 5/5 | 1/1 | 6/6 | 100% |
| Phase 2: useSpinner Hook | 6/6 | 2/2 | 8/8 | 100% |
| Phase 3: Spinner 페이지 | 6/6 | 3/3 | 9/9 | 100% |
| Phase 4: Feature Documentation | - | 2/2 | 2/2 | 100% |

---

## 관련 파일

**소스 코드**

- `lib/spinner/pick-random-item.ts` (Phase 1)
- `lib/spinner/use-spinner.ts` (Phase 2)
- `app/spinner/page.tsx` (Phase 3)

**테스트**

- `__tests__/spinner/pick-random-item.test.ts` (Phase 1)
- `__tests__/spinner/use-spinner.test.ts` (Phase 2)
- `__tests__/spinner/spinner-page.test.ts` (Phase 3)

**기존 참조 파일**

- `drizzle/schema.ts` — restaurants 테이블 스키마
- `app/api/restaurants/route.ts` — GET /api/restaurants (데이터 소스)
- `app/restaurants/page.tsx` — Restaurant 인터페이스 참조

---

## 커밋 히스토리

| 커밋 타입 | 설명 | 날짜 |
|-----------|------|------|
| | | |

---

## 메모

- **데이터 소스**: `GET /api/restaurants` API가 이미 존재함. 별도 백엔드 작업 불필요.
- **Restaurant 인터페이스**: `{ id, name, category, description, photoPath, createdAt, updatedAt }` — 휠에는 `name`과 `category`를 주로 표시.
- **테스트 환경**: Phase 2~3에서 `@testing-library/react` + `jsdom` 환경 필요. Phase 1 시작 전에 설치.
- **스타일링**: 프로젝트 전체 스타일링은 "추후 결정" 상태. 인라인 스타일 + CSS transition으로 구현 예정 (기존 패턴 따름).
- **애니메이션**: CSS `transform: rotate()` + `transition`으로 구현. 별도 애니메이션 라이브러리 불필요.
