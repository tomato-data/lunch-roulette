# Lunch Vote TDD Plan

> 직원들이 브라우저로 접속하여 점심 메뉴에 투표하고, 결과를 실시간으로 확인하는 기능

**도메인**: lunch-roulette
**생성일**: 2026-04-01
**상태**: ~~IN_PROGRESS~~ COMPLETED
**완료일**: 2026-04-01

---

## 요구사항 요약

1. **투표 세션 생성**: 누군가 "오늘 점심 투표" 세션을 시작
2. **메뉴 후보 등록**: 세션에 점심 메뉴 후보들을 추가
3. **투표**: 직원들이 브라우저(`http://호스트IP:3000`)로 접속하여 메뉴에 투표
4. **결과 확인**: 투표 현황/결과를 실시간으로 표시
5. **단일 배포**: Next.js 한 대에서 프론트+API+DB 모두 서빙 (`npm run dev -- -H 0.0.0.0`)

**제약 사항**:
- 로컬 네트워크 전용 (인터넷 배포 X)
- 인증 없음 (닉네임 정도로 구분)
- SQLite 단일 파일 DB

---

## Forces Analysis

### 변동 식별

| 변동 요소 | 변경 주기/이유 | 독립성 |
|----------|--------------|--------|
| 메뉴 후보 목록 | 매 세션마다 변경 | 독립 |
| 투표 규칙 (1인 1표 등) | 거의 변하지 않음 | 없음 |
| 결과 표시 방식 | UI 변경 시 | 없음 |

### 패턴 신호 진단

| 신호 | 현재 상태 | 판단 |
|------|----------|------|
| 독립적 변동이 3개+ 있는가? | 아니오 | - |
| 단계들이 함께 변하는가? | 아니오 | - |
| 순서/개수가 가변인 선택적 단계? | 아니오 | - |
| 런타임까지 결정이 불확실한가? | 아니오 | - |
| 비즈니스적으로 무효한 조합? | 아니오 | - |
| **Force가 아직 없는가?** | **예** | → **단순 유지 (if/else OK)** |

**결론**: 패턴 불필요. 단순 CRUD + 간단한 비즈니스 규칙(중복 투표 방지)으로 충분.

---

## 객체 디자인 퀵 레퍼런스

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
| `VoteSession` | 개체(Entity) | id로 식별, 상태 변경(open→closed), 생명주기 있음 |
| `Vote` | 개체(Entity) | id로 식별, 세션·투표자·메뉴 연결 |
| `MenuItem` | 개체(Entity) | id로 식별, 세션에 종속된 메뉴 후보 |
| `VoteService` | 서비스 | 무상태, 투표 비즈니스 규칙 처리 (중복 방지 등) |
| `CreateVoteRequest` | DTO | API 경계 입력값 |
| `VoteResult` | DTO | API 경계 출력값 (메뉴별 득표수) |

### 디자인 체크포인트

| 단계       | 키워드 체크                             | 참조 규칙                                                                         |
| ---------- | --------------------------------------- | --------------------------------------------------------------------------------- |
| **생성**   | 생성자 주입? 최소 데이터? 값 객체 추출? | `svc-constructor-inject`, `obj-require-minimum-data`, `obj-extract-value-object`  |
| **변경**   | 불변 우선? 상태 전이 보호? 이벤트 기록? | `mut-immutable-first`, `mut-valid-state-transition`, `mut-record-domain-events`   |
| **메서드** | CQS 준수? 정보 은닉? 경계 추상화?       | `method-cqs-separation`, `method-information-hiding`, `method-domain-abstraction` |
| **테스트** | 쿼리→스텁? 명령→목? 블랙박스?           | `test-stub-for-query`, `test-mock-for-command`, `test-object-not-class`           |

---

## 테스트 전략

### 레이어별 단위 테스트 적합성 확인

| 레이어 | 단위 테스트 적합성 | 이유 |
|--------|-------------------|------|
| **Drizzle Schema / Repository** | 부적합 (통합 테스트) | 함수의 행위 = DB 쿼리 자체. Mock하면 mock tautology |
| **VoteService** | 적합 (Repository를 mock) | 중복 투표 방지 등 비즈니스 로직이 검증 대상 |
| **API Route Handler** | 적합 (Service를 mock) | 요청 파싱/응답 직렬화가 검증 대상 |
| **Domain (VoteSession)** | 적합 (실제 객체) | 상태 전이 로직, 외부 의존성 없음 |

### 의존성 분류

| 의존성 | 유형 | 테스트 대역 | 검증 방식 |
|--------|------|-----------|----------|
| DB (Drizzle queries) | 시스템 경계 | 인메모리 SQLite | 통합 테스트에서 실제 DB 사용 |
| VoteRepository (Service에서) | 쿼리 | 가짜 (직접 작성) | 반환값 → 결과 검증 |

### 생성자 테스트 범위

| 객체 | 실패 테스트 | happy path |
|------|-----------|------------|
| VoteSession | 빈 제목 | 행위 테스트가 암시적 커버 |
| Vote | 빈 voterName, 빈 menuItemId | 행위 테스트가 암시적 커버 |

### 상태 변경 검증 방식

| 개체 | 변경자 | 검증 방식 |
|------|--------|----------|
| VoteSession | close() | session.isClosed 쿼리 메서드 |

---

## 값 객체 후보 (Primitive Obsession 검토)

해당 없음 (📖 Read: obj-extract-value-object.md, obj-extract-composite.md 확인 완료)

신규 프로젝트이며, 현재 코드베이스가 없어 원시값 클러스터가 존재하지 않음.
투표 도메인의 데이터(voterName, menuName 등)는 단순 문자열이며, 별도 VO로 추출할 만큼 검증 로직이 반복되지 않을 것으로 판단. REFACTOR 단계에서 재평가.

---

## 기존 테스트 영향 분석

해당 없음 — 신규 프로젝트, 기존 테스트 없음.

---

## TDD 테스트 계획

### Phase 1: 프로젝트 초기 설정 + DB 스키마

> Next.js 프로젝트 생성, Drizzle ORM 설정, 테이블 스키마 정의

**단위 테스트**

- 단위 테스트 없음 (스키마/설정은 단위 테스트 부적합)

**통합 체크** (Phase 완료 시)

- [x] `npm run dev`로 Next.js 정상 기동 확인
- [x] `npm run db:push`로 SQLite에 테이블 생성 확인
- [x] Drizzle Studio 또는 직접 쿼리로 vote_sessions, menu_items, votes 테이블 존재 확인

### Phase 2: VoteSession 도메인 로직

> 투표 세션의 생성, 열림/닫힘 상태 전이 로직

**단위 테스트**

- [x] `test_create_session_with_valid_title`: 제목으로 세션 생성 시 open 상태
- [x] `test_create_session_rejects_empty_title`: 빈 제목은 에러
- [x] `test_close_session`: open 세션을 close하면 isClosed가 true
- [x] `test_close_already_closed_session_throws`: 이미 닫힌 세션을 닫으면 에러

**통합 체크** (Phase 완료 시)

- [x] VoteSession 모듈이 독립적으로 import 가능한지 확인
- [x] DB 의존성 없이 순수 로직만으로 동작하는지 확인

### Phase 3: VoteService 비즈니스 로직

> 투표 처리의 핵심 규칙 — 중복 투표 방지, 닫힌 세션 투표 거부

**단위 테스트**

- [x] `test_cast_vote_success`: 유효한 세션 + 투표자 + 메뉴 → 투표 성공
- [x] `test_cast_vote_rejects_closed_session`: 닫힌 세션에 투표 시 에러
- [x] `test_cast_vote_rejects_duplicate`: 같은 세션에 같은 투표자가 재투표 시 에러
- [x] `test_get_results_returns_vote_counts`: 메뉴별 득표수를 정확히 집계

**통합 체크** (Phase 완료 시)

- [x] VoteService → Repository(가짜) 체인이 연결되어 동작하는지 확인
- [x] 실제 SQLite DB로 VoteService 전체 흐름 동작 확인 (통합 테스트)

### Phase 4: API Route Handlers

> Next.js Route Handlers로 REST API 구현

**단위 테스트**

- [x] `POST /api/sessions` — 세션 생성 → 201 + session 반환
- [x] `POST /api/sessions/[id]/menu` — 메뉴 후보 추가 → 201
- [x] `POST /api/sessions/[id]/vote` — 투표 → 201
- [x] `POST /api/sessions/[id]/vote` 중복 — 409 Conflict
- [x] `GET /api/sessions/[id]/results` — 결과 조회 → 200 + 득표수
- [x] `PATCH /api/sessions/[id]/close` — 세션 종료 → 200

**통합 체크** (Phase 완료 시)

- [x] 브라우저/curl로 실제 API 호출 → DB 저장 → 결과 조회 체인 확인
- [x] 다른 기기에서 `http://호스트IP:3000/api/sessions` 접근 가능 확인

### Phase 5: 프론트엔드 UI

> 투표 화면, 결과 화면 구현

**단위 테스트**

- [x] 세션 생성 폼 렌더링 확인
- [x] 메뉴 목록 표시 + 투표 버튼 동작 확인
- [x] 결과 화면에서 메뉴별 득표수 표시 확인
- [x] 닫힌 세션에서 투표 버튼 비활성화 확인

**통합 체크** (Phase 완료 시)

- [x] 세션 생성 → 메뉴 추가 → 투표 → 결과 확인 전체 플로우 동작
- [x] 다른 PC 브라우저에서 동일 플로우 동작 확인
- [x] `npm run dev -- -H 0.0.0.0`으로 외부 접속 가능 확인

### Phase 6: Feature Documentation

> 구현 완료 후 기능 문서를 생성 또는 업데이트한다.

- [x] 기능 문서 생성 또는 업데이트 (`docs/features/lunch/vote.md`)
- [x] `docs/features/index.md`에 누락된 항목 추가

---

## 진행 상황

| Phase   | 단위 | 통합 | 전체 | 진행률 |
| ------- | ---- | ---- | ---- | ------ |
| Phase 1 | 0/0  | 3/3  | 3/3  | 100%   |
| Phase 2 | 4/4  | 2/2  | 6/6  | 100%   |
| Phase 3 | 4/4  | 2/2  | 6/6  | 100%   |
| Phase 4 | 6/6  | 2/2  | 8/8  | 100%   |
| Phase 5 | 4/4  | 3/3  | 7/7  | 100%   |
| Phase 6 | 0/0  | 2/2  | 2/2  | 100%   |

---

## 관련 파일

**소스 코드**

- `app/` — Next.js App Router (pages + API routes)
- `app/api/sessions/` — 투표 세션 API
- `drizzle/` — DB schema, migrations
- `data/` — SQLite DB 파일

**테스트**

- `__tests__/` 또는 `*.test.ts` — 테스트 파일 (추후 생성)

---

## 커밋 히스토리

| 커밋 타입    | 설명 | 날짜 |
| ------------ | ---- | ---- |
| [BEHAVIORAL] |      |      |
| [STRUCTURAL] |      |      |

---

## 메모

- **배포 방식**: `npm run dev -- -H 0.0.0.0`으로 로컬 네트워크 공유
- **인증**: 없음. 닉네임으로 투표자 구분 (간단하게 유지)
- **DB**: SQLite 파일 하나 (`data/lunch-roulette.db`)
- **테스트 프레임워크**: Vitest (Next.js + TypeScript와 호환성 좋음)
- **VO 재평가**: REFACTOR 단계에서 voterName 등의 VO 추출 필요성 재검토
