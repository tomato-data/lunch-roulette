# 투표-음식점 연동 TDD Plan

> 투표 시 자유 텍스트 메뉴 대신, DB에 등록된 음식점을 검색·선택하여 세션에 추가하고 투표하는 기능

**도메인**: lunch/vote
**생성일**: 2026-04-01
**상태**: IN_PROGRESS

---

## 요구사항 요약

1. 투표 세션에 메뉴(자유 텍스트)가 아닌 **음식점(restaurants)**을 추가한다
2. 입력 시 **autocomplete** — 텍스트 입력하면 LIKE 검색(debounce 0.5초)으로 매칭되는 음식점 목록이 하단에 표시, 선택 가능
3. 정확히 DB에 존재하는 음식점만 추가 가능 (restaurantId 기반)
4. 기존 투표·결과 조회 로직은 음식점 기반으로 전환
5. **결과 비공개 → 개봉 시간 공개** — 투표 결과는 실시간으로 보여주지 않고, 세션 생성 시 설정한 `revealAt`(개봉 시간, default 12:55 KST) 이후에만 당첨 결과 노출
6. **방문 확정 (win count)** — 투표 결과 당첨된 음식점은 "확정 대기" 상태가 되고, 실제 방문 시 확정 처리하면 해당 음식점의 `winCount +1`
7. **방문 히스토리 테이블** — 날짜별로 어느 음식점을 갔는지 저장하는 `lunch_history` 테이블
8. **세션 목록 페이지네이션** — 5개 세션씩 페이지네이션

### 변경 범위

| 현재 (AS-IS) | 변경 후 (TO-BE) |
|--------------|----------------|
| `menu_items.name` (자유 텍스트) | `menu_items.restaurant_id` (FK → restaurants) |
| POST `/sessions/[id]/menu` body: `{ name }` | POST `/sessions/[id]/menu` body: `{ restaurantId }` |
| 결과에 `menuName` 표시 | 결과에 `restaurant.name + category` 표시 |
| 프론트: 텍스트 입력 → 추가 | 프론트: 텍스트 입력 → autocomplete(debounce 0.5s) → 선택 → 추가 |
| 투표 결과 실시간 노출 | `revealAt` 시간 이후에만 당첨 결과 공개 |
| 세션에 `status`만 존재 | `revealAt` (개봉 시간, default 12:55 KST) 추가 |
| 당첨 후 끝 | 당첨 → 확정 대기 → 방문 확정 시 `winCount +1` |
| 히스토리 없음 | `lunch_history` 테이블에 날짜별 방문 기록 저장 |
| 세션 목록 전체 표시 | 5개씩 페이지네이션 |

---

## Forces Analysis

**변동 식별**: 이 기능에서 무엇이 변하는가? 왜 변하는가?

| 변동 요소 | 변경 주기/이유 | 독립성 |
|----------|--------------|--------|
| 음식점 검색 로직 (LIKE) | 검색 UX 개선 시 변경 가능 | 독립 |
| 세션-음식점 연결 | 안정 (한번 정해지면 변경 없음) | 없음 |
| 개봉 시간 로직 | 안정 (시간 비교) | 없음 |
| 방문 확정 플로우 | 안정 (당첨 → 확정) | 없음 |

**패턴 신호 진단**:

| 신호 | 현재 상태 | 판단 |
|------|----------|------|
| 독립적 변동이 3개+ 있는가? | 아니오 | — |
| 단계들이 함께 변하는가? | 아니오 | — |
| 순서/개수가 가변인 선택적 단계? | 아니오 | — |
| 런타임까지 결정이 불확실? | 아니오 | — |
| 비즈니스적으로 무효한 조합? | 아니오 | — |
| **Force가 아직 없는가?** | 예 | → **단순 유지** |

**결론**: 패턴 불필요. 기존 서비스/리포지토리 구조에 검색 메서드와 FK 추가로 충분.

---

## 객체 디자인 퀵 레퍼런스

### 객체 분류 기준

| 분류 | 특성 | 불변성 | 예시 |
|------|------|--------|------|
| **서비스** | 무상태, 의존성 주입, 행위 중심 | 생성 후 불변 | `VoteService` |
| **개체(Entity)** | 식별자, 상태 변경 | 변경 가능 | `VoteSession` |
| **값 객체** | 값 = 식별자, frozen | 불변 | — |
| **DTO** | 경계 객체, 공개 속성 | 불변 | 요청/응답 body |

### 이 기능의 객체 분류

| 클래스명 | 분류 | 근거 |
|---------|------|------|
| `VoteService` | 서비스 | 기존 서비스에 검색 위임·방문 확정 추가, 무상태 |
| `VoteRepository` | 서비스 (인터페이스) | 데이터 접근 추상화, 검색·히스토리 메서드 추가 |
| `DrizzleVoteRepository` | 서비스 (구현) | Drizzle ORM으로 LIKE 검색·히스토리 구현 |
| `VoteSession` | 개체 (Entity) | `revealAt` 상태 추가, 개봉 시간 판단 로직 |

### 디자인 체크포인트

| 단계 | 키워드 체크 | 참조 규칙 |
|------|-----------|----------|
| **생성** | 기존 서비스 확장, 새 객체 생성 없음 | `svc-constructor-inject` |
| **메서드** | CQS 준수 (검색=쿼리, 추가=명령) | `method-cqs-separation` |
| **테스트** | 쿼리→스텁, 명령→목 | `test-stub-for-query`, `test-mock-for-command` |

---

## 값 객체 후보 (Primitive Obsession 검토)

해당 없음 (📖 Read: obj-extract-value-object.md, obj-extract-composite.md 확인 완료)

이 기능에서 반복 검증이 필요한 원시값 클러스터 없음. `restaurantId`는 단일 integer FK이며 DB 제약조건이 유효성을 보장.

---

## 테스트 전략

### 레이어별 단위 테스트 적합성

| 레이어 | 단위 테스트 적합성 | 이유 |
|--------|-------------------|------|
| Restaurant 검색 API | 적합 (통합) | LIKE 쿼리 결과 검증 |
| Menu API (restaurant 연동) | 적합 (통합) | FK 유효성 + 중복 방지 검증 |
| VoteService | 적합 (단위) | 비즈니스 로직 검증, repo는 mock |
| DrizzleVoteRepository | 부적합 (통합) | LIKE 쿼리 자체가 행위, mock하면 tautology |
| VoteSession (revealAt) | 적합 (단위) | 시간 비교 순수 로직 |
| 방문 확정 API | 적합 (통합) | DB 상태 변경 검증 |
| 세션 목록 페이지네이션 | 적합 (통합) | offset/limit 결과 검증 |
| Frontend autocomplete | 적합 (컴포넌트) | UI 상호작용 검증 |

### 의존성 분류

| 의존성 | 유형 | 테스트 대역 | 검증 방식 |
|--------|------|-----------|----------|
| VoteRepository.searchRestaurants() | 쿼리 | 가짜 (직접 작성) | 반환값 → 결과 검증 |
| VoteRepository.restaurantExists() | 쿼리 | 가짜 | boolean 반환 검증 |
| VoteRepository.saveMenuItemByRestaurant() | 명령 | 스파이 | 호출 여부·인자 검증 |
| VoteRepository.confirmVisit() | 명령 | 스파이 | 호출 여부·인자 검증 |
| VoteRepository.saveLunchHistory() | 명령 | 스파이 | 호출 여부·인자 검증 |

### 생성자 테스트 범위

| 객체 | 실패 테스트 | happy path |
|------|-----------|------------|
| 새 객체 없음 | — | — |

### 상태 변경 검증 방식

기존 VoteSession 상태 변경 로직 그대로 유지. 추가 상태 변경 없음.

---

## 기존 테스트 영향 분석

| 변경 유형 | grep 패턴 | 영향 예상 |
|----------|----------|----------|
| menu API body 변경 (`name` → `restaurantId`) | `menuItem\|menu_item\|addMenu` in `__tests__/` | sessions.test.ts ~16건 수정 |
| VoteRepository 인터페이스 변경 | `menuItemExists\|saveVote` in `__tests__/` | vote-service.test.ts ~8건 수정 |
| 결과 응답 필드 변경 (`menuName` → restaurant 정보) | `menuName` in `__tests__/` | sessions.test.ts 결과 검증 수정 |
| vote_sessions 테이블 변경 (`revealAt` 추가) | `voteSessions\|vote_sessions` in `__tests__/` | 세션 생성 테스트 수정 |
| restaurants 테이블 변경 (`winCount` 추가) | `restaurants` in `__tests__/` | 해당 테스트 확인 필요 |

기존 테스트 수정은 각 Phase 통합 체크에 포함.

---

## TDD 테스트 계획

### Phase 1: 음식점 검색 API (LIKE 자동완성)

**단위 테스트** (`__tests__/api/restaurant-search.test.ts`)

- [ ] `GET /api/restaurants/search?q=카츠` → 카츠올로지, 카츠올로지 옆 반환
- [ ] `GET /api/restaurants/search?q=` (빈 쿼리) → 빈 배열 반환
- [ ] `GET /api/restaurants/search?q=없는식당` → 빈 배열 반환
- [ ] `GET /api/restaurants/search?q=밥` → 밥온 반환 (부분 매칭)

**통합 체크** (Phase 완료 시)

- [ ] 실제 DB에 시드 데이터 넣고 LIKE 검색 결과 확인
- [ ] 응답 형태: `{ id, name, category }[]`

### Phase 2: 세션에 음식점 추가 (menu_items → restaurant 연동)

**단위 테스트** (`__tests__/api/sessions.test.ts` 수정)

- [ ] `POST /sessions/[id]/menu` with `{ restaurantId }` → 201, 음식점 정보 포함 응답
- [ ] `POST /sessions/[id]/menu` with 존재하지 않는 restaurantId → 404
- [ ] `POST /sessions/[id]/menu` with 이미 추가된 restaurantId → 409 (중복 방지)
- [ ] `GET /sessions/[id]/menu` → 음식점 이름·카테고리 포함 목록 반환

**통합 체크** (Phase 완료 시)

- [ ] menu_items 테이블에 restaurant_id FK 정상 저장 확인
- [ ] 기존 sessions.test.ts의 메뉴 관련 테스트 전부 수정 완료
- [ ] `npm run test` 전체 통과

### Phase 3: 투표 결과에 음식점 정보 반영

**단위 테스트** (`__tests__/service/vote-service.test.ts` 수정)

- [ ] `VoteService.castVote()` — 정상 투표 (기존 로직 유지, restaurantId 기반)
- [ ] `VoteService.getResults()` — 결과에 음식점 name, category 포함
- [ ] 기존 중복 투표·세션 종료 검증 유지

**통합 체크** (Phase 완료 시)

- [ ] `GET /sessions/[id]/results` 응답에 `restaurantName`, `category` 포함
- [ ] vote-service.test.ts, vote-repository 인터페이스 수정 완료
- [ ] `npm run test` 전체 통과

### Phase 4: 개봉 시간 (revealAt) 로직

**단위 테스트**

- [ ] `VoteSession.create()` — `revealAt` 미지정 시 당일 12:55 KST 기본값
- [ ] `VoteSession.create()` — `revealAt` 지정 시 해당 시간 저장
- [ ] `VoteSession.isRevealed()` — 현재 시간 < revealAt → false
- [ ] `VoteSession.isRevealed()` — 현재 시간 >= revealAt → true

**통합 테스트** (`__tests__/api/sessions.test.ts` 수정)

- [ ] `POST /sessions` — revealAt 포함하여 세션 생성, DB 저장 확인
- [ ] `GET /sessions/[id]/results` — revealAt 이전 요청 시 결과 비공개 (403 or 빈 응답)
- [ ] `GET /sessions/[id]/results` — revealAt 이후 요청 시 당첨 결과 공개
- [ ] 프론트: 개봉 시간 전에는 투표 수 숨김, 이후에 당첨 결과 표시

**통합 체크** (Phase 완료 시)

- [ ] `vote_sessions` 테이블에 `reveal_at` 컬럼 추가 확인
- [ ] 기존 세션 생성 테스트 수정 완료
- [ ] `npm run test` 전체 통과

### Phase 5: 방문 확정 & win count

**단위 테스트**

- [ ] `POST /sessions/[id]/confirm` — 당첨 음식점 방문 확정 → `restaurants.winCount +1`
- [ ] `POST /sessions/[id]/confirm` — 이미 확정된 세션 재확정 시 409
- [ ] `POST /sessions/[id]/confirm` — revealAt 이전 확정 시도 → 400
- [ ] `restaurants` 테이블에 `winCount` 컬럼 추가, 기본값 0

**통합 테스트**

- [ ] 확정 시 `lunch_history` 테이블에 날짜 + 음식점 기록 저장
- [ ] `GET /api/lunch-history` — 날짜별 방문 기록 조회

**통합 체크** (Phase 완료 시)

- [ ] `restaurants.win_count` 컬럼 정상 동작
- [ ] `lunch_history` 테이블 생성 및 데이터 저장 확인
- [ ] `npm run test` 전체 통과

### Phase 6: 세션 목록 페이지네이션

**단위 테스트** (`__tests__/api/sessions.test.ts` 수정)

- [ ] `GET /sessions?page=1` → 최신 5개 세션 반환
- [ ] `GET /sessions?page=2` → 다음 5개 세션 반환
- [ ] `GET /sessions` (page 미지정) → 기본 page=1
- [ ] 응답에 `totalCount`, `totalPages`, `currentPage` 포함

**통합 체크** (Phase 완료 시)

- [ ] 프론트: 페이지 이동 UI (이전/다음) 동작 확인
- [ ] 기존 세션 목록 테스트 수정 완료
- [ ] `npm run test` 전체 통과

### Phase 7: 프론트엔드 Autocomplete UI

**단위 테스트** (`__tests__/components/restaurant-autocomplete.test.tsx`)

- [ ] 텍스트 입력 시 debounce 0.5초 후 `/api/restaurants/search?q=` 호출
- [ ] 검색 결과 드롭다운에 음식점 목록 표시 (이름 + 카테고리)
- [ ] 항목 클릭 시 선택 콜백 호출 (restaurantId 전달)
- [ ] 입력 비우면 드롭다운 숨김

**통합 체크** (Phase 완료 시)

- [ ] app/page.tsx에서 Autocomplete 컴포넌트 사용 확인
- [ ] 기존 자유 텍스트 입력 제거, autocomplete로 교체
- [ ] 선택 → 세션 추가 → 투표 → 결과(개봉 시간 후) → 방문 확정 전체 플로우 동작
- [ ] `npm run test` 전체 통과

### Phase 8: Feature Documentation

- [ ] 기능 문서 업데이트 (`docs/features/lunch/vote.md`)
- [ ] `docs/features/index.md`에 변경 사항 반영

---

## 진행 상황

| Phase | 단위 | 통합 | 전체 | 진행률 |
|-------|------|------|------|--------|
| Phase 1: 음식점 검색 API | 0/4 | 0/2 | 0/6 | 0% |
| Phase 2: 세션-음식점 연동 | 0/4 | 0/3 | 0/7 | 0% |
| Phase 3: 투표 결과 음식점 반영 | 0/3 | 0/3 | 0/6 | 0% |
| Phase 4: 개봉 시간 (revealAt) | 0/4 | 0/4 | 0/8 | 0% |
| Phase 5: 방문 확정 & win count | 0/4 | 0/2 | 0/6 | 0% |
| Phase 6: 세션 목록 페이지네이션 | 0/4 | 0/3 | 0/7 | 0% |
| Phase 7: 프론트엔드 Autocomplete | 0/4 | 0/4 | 0/8 | 0% |
| Phase 8: Feature Documentation | 0/2 | — | 0/2 | 0% |

---

## 관련 파일

**소스 코드**

- `drizzle/schema.ts` — menu_items에 restaurantId FK, vote_sessions에 revealAt, restaurants에 winCount, lunch_history 테이블 추가
- `app/api/restaurants/search/route.ts` — 신규: 음식점 검색 API
- `app/api/sessions/[id]/menu/route.ts` — 수정: restaurantId 기반으로 변경
- `app/api/sessions/[id]/results/route.ts` — 수정: revealAt 체크 + 음식점 정보 포함
- `app/api/sessions/[id]/confirm/route.ts` — 신규: 방문 확정 API
- `app/api/sessions/route.ts` — 수정: revealAt 파라미터 + 페이지네이션
- `app/api/lunch-history/route.ts` — 신규: 방문 히스토리 조회
- `lib/service/vote-repository.ts` — 수정: 검색·확정·히스토리 메서드 추가
- `lib/service/drizzle-vote-repository.ts` — 수정: LIKE 검색·확정·히스토리 구현
- `lib/domain/vote-session.ts` — 수정: revealAt, isRevealed() 추가
- `app/page.tsx` — 수정: autocomplete UI, 개봉 시간, 방문 확정, 페이지네이션
- `app/components/restaurant-autocomplete.tsx` — 신규: autocomplete 컴포넌트

**테스트**

- `__tests__/api/restaurant-search.test.ts` — 신규
- `__tests__/api/sessions.test.ts` — 수정 (menu 연동, revealAt, 페이지네이션)
- `__tests__/api/confirm.test.ts` — 신규 (방문 확정)
- `__tests__/api/lunch-history.test.ts` — 신규
- `__tests__/service/vote-service.test.ts` — 수정
- `__tests__/domain/vote-session.test.ts` — 수정 (revealAt, isRevealed)
- `__tests__/components/restaurant-autocomplete.test.tsx` — 신규

---

## 커밋 히스토리

| 커밋 타입 | 설명 | 날짜 |
|-----------|------|------|
| | | |

---

## 메모

- `menu_items.name` 컬럼은 유지하되, restaurant.name으로 자동 채워지는 구조 (or 제거 후 JOIN으로 해결)
- 기존 menu_items 데이터는 마이그레이션 불필요 (아직 실사용 데이터 없음)
- LIKE 검색은 `%query%` 패턴 사용, SQLite는 한글 LIKE 기본 지원
- debounce는 프론트에서 처리 (300ms 권장)
