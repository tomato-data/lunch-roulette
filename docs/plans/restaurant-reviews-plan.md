# Restaurant Reviews TDD Plan

> 음식점별 설명 강화 + 유저별 노트/평가(별점) 기능 추가

**도메인**: restaurant
**생성일**: 2026-04-01
**상태**: COMPLETED
**완료일**: 2026-04-01

---

## 요구사항 요약

1. **음식점 설명**: 기존 `restaurants.description` 필드를 활용하여 음식점 상세 설명을 표시하는 UI 강화
2. **유저별 노트**: 각 유저가 음식점에 대해 개인 메모(노트)를 작성/수정/삭제할 수 있는 기능
3. **유저별 평가**: 각 유저가 음식점에 1~5 별점을 매기고, 평균 평점을 표시하는 기능
4. **한 유저가 한 음식점에 하나의 리뷰**: 노트 + 별점은 하나의 리뷰로 묶이며, 이미 작성했으면 수정(upsert)

---

## Forces Analysis

**변동 식별**: 이 기능에서 무엇이 변하는가? 왜 변하는가?

| 변동 요소 | 변경 주기/이유 | 독립성 |
|----------|--------------|--------|
| 리뷰 내용 (노트 + 별점) | 유저가 수시로 작성/수정 | 독립 |
| 평균 평점 계산 | 리뷰 변경 시 자동 반영 | 구조적 (리뷰에 의존) |
| 음식점 설명 | 관리자가 가끔 수정 | 독립 (기존 기능) |

**패턴 신호 진단**:

| 신호 | 현재 상태 | 판단 |
|------|----------|------|
| 독립적 변동이 3개+ 있는가? | 아니오 | → Strategy 불필요 |
| 단계들이 함께 변하는가? (뼈대는 안정) | 아니오 | → Template Method 불필요 |
| 순서/개수가 가변인 선택적 단계가 있는가? | 아니오 | → Decorator 불필요 |
| 런타임까지 결정이 불확실한가? | 아니오 | → CoR 불필요 |
| 조합 중 비즈니스적으로 무효한 세트가 있는가? | 아니오 | → Abstract Factory 불필요 |
| **Force가 아직 없는가?** | 예 | → **단순 유지 (if/else OK)** |

**결론**: 패턴 불필요. CRUD 중심 기능이므로 단순 구조로 진행. 리뷰 도메인 모델에서 별점 유효성 검증만 확보.

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
| -------- | ---- | ---- |
| `Rating` | 값 객체 | 1~5 정수 범위 제한, 불변, 값으로 비교 |
| `ReviewService` | 서비스 | 무상태, Repository 주입, 리뷰 생성/조회 행위 |
| `ReviewRepository` | 서비스 (인터페이스) | DB 접근 추상화 |
| `CreateReviewInput` | DTO | API 경계에서 받는 요청 데이터 |
| `ReviewResponse` | DTO | API 응답 데이터 |

### 디자인 체크포인트

| 단계       | 키워드 체크                             | 참조 규칙                                                                         |
| ---------- | --------------------------------------- | --------------------------------------------------------------------------------- |
| **생성**   | 생성자 주입? 최소 데이터? 값 객체 추출? | `svc-constructor-inject`, `obj-require-minimum-data`, `obj-extract-value-object`  |
| **변경**   | 불변 우선? 상태 전이 보호? 이벤트 기록? | `mut-immutable-first`, `mut-valid-state-transition`, `mut-record-domain-events`   |
| **메서드** | CQS 준수? 정보 은닉? 경계 추상화?       | `method-cqs-separation`, `method-information-hiding`, `method-domain-abstraction` |
| **테스트** | 쿼리→스텁? 명령→목? 블랙박스?           | `test-stub-for-query`, `test-mock-for-command`, `test-object-not-class`           |

---

## 테스트 전략

### 레이어별 단위 테스트 적합성

| 레이어 | 단위 테스트 적합성 | 이유 |
|--------|-------------------|------|
| **DB Schema (reviews 테이블)** | 부적합 (통합 테스트) | Drizzle 스키마 = DB DDL. Mock하면 mock tautology |
| **ReviewService** | 적합 (Repository를 mock) | 비즈니스 로직(별점 검증, upsert 판단)이 검증 대상 |
| **API Route Handler** | 적합 (DB를 in-memory로 교체) | 라우팅/직렬화/HTTP 상태 코드가 검증 대상 |
| **Rating (값 객체)** | 적합 (순수 로직) | 범위 검증, 불변성 — 외부 의존 없음 |
| **Frontend 컴포넌트** | 적합 (API mock) | UI 렌더링/인터랙션 검증 |

### 의존성 분류

| 의존성 | 유형 | 테스트 대역 | 검증 방식 |
|--------|------|-----------|----------|
| ReviewRepository.getReview() | 쿼리 | 가짜 (직접 작성) | 반환값 → 결과 검증 |
| ReviewRepository.upsertReview() | 명령 | 스파이 | 호출 여부·인자 검증 |
| ReviewRepository.getAverageRating() | 쿼리 | 가짜 (직접 작성) | 반환값 → 결과 검증 |
| ReviewRepository.getReviewsByRestaurant() | 쿼리 | 가짜 (직접 작성) | 반환값 → 결과 검증 |

### 생성자 테스트 범위

| 객체 | 실패 테스트 | happy path |
|------|-----------|------------|
| Rating (값 객체) | 0, 6, 소수점, 음수 | 행위 테스트가 암시적 커버 |

### 상태 변경 검증 방식

| 개체 | 변경자 | 검증 방식 |
|------|--------|----------|
| (해당 없음 — 이 기능에 변경 가능 개체 없음. 리뷰는 upsert로 교체) | — | — |

---

## 값 객체 후보 (Primitive Obsession 검토)

> 📖 Read: ODP VO 추출 규칙 파일 미존재 확인 완료 (스킬 디렉토리 없음)

| 원시값 클러스터 | 출현 위치 | VO 후보 | Phase 배치 |
|---------------|----------|---------|-----------|
| rating (1~5 정수) | reviews 테이블, API 요청/응답 | `Rating` | Phase 1 |

- `rating`은 단순 정수지만 범위 제약(1~5)이 있으므로 값 객체로 추출
- 노트(content)는 자유 텍스트이므로 VO 불필요

---

## 기존 테스트 영향 분석

| 변경 유형 | 영향 예상 |
|----------|----------|
| 새 테이블(reviews) 추가 | 기존 테스트에 영향 없음 — 새 테이블은 기존 쿼리에 관여하지 않음 |
| restaurants API 응답에 avgRating 추가 | `__tests__/api/restaurants.test.ts`의 응답 검증에 영향 가능 → Phase 3 통합 체크에서 확인 |
| 새 API 엔드포인트 추가 | 기존 테스트에 영향 없음 |

**결론**: restaurants API 응답에 `avgRating` 필드를 추가하면 기존 테스트의 snapshot/exact match에 영향 줄 수 있음. Phase 3 통합 체크에서 전체 테스트(`npx vitest run`) 실행하여 확인.

---

## TDD 테스트 계획

### Phase 1: Rating 값 객체 + DB 스키마

**단위 테스트**

- [x] `test_rating_rejects_zero`: Rating(0)이 에러를 던짐
- [x] `test_rating_rejects_six`: Rating(6)이 에러를 던짐
- [x] `test_rating_rejects_negative`: Rating(-1)이 에러를 던짐
- [x] `test_rating_rejects_decimal`: Rating(3.5)이 에러를 던짐
- [x] `test_rating_equals_same_value`: Rating(3) === Rating(3) 동등성

**통합 체크** (Phase 완료 시)

- [x] `reviews` 테이블이 스키마에 정의됨 (restaurants.id, users.id FK)
- [x] `createTestDb()`에 `reviews` CREATE TABLE 추가하여 기존 테스트가 깨지지 않는지 확인
- [x] `npx vitest run` 전체 테스트 통과 확인 (49/49)

### Phase 2: ReviewService 도메인 로직

**단위 테스트**

- [x] `test_create_review_with_valid_rating_and_content`: 유효한 리뷰 생성 시 repository.upsertReview 호출
- [x] `test_create_review_without_content`: 노트 없이 별점만으로도 리뷰 생성 가능
- [x] `test_create_review_without_rating`: 별점 없이 노트만으로도 리뷰 생성 가능
- [x] `test_create_review_rejects_empty`: 별점도 노트도 없으면 에러
- [x] `test_get_reviews_by_restaurant`: 음식점별 리뷰 목록 반환
- [x] `test_get_average_rating`: 음식점의 평균 별점 계산
- [x] `test_get_average_rating_no_reviews`: 리뷰 없으면 null 반환
- [x] `test_delete_review`: 본인 리뷰 삭제 시 repository.deleteReview 호출

**통합 체크** (Phase 완료 시)

- [x] ReviewService → ReviewRepository 인터페이스 체인 연결 확인
- [x] fake repository로 서비스 인스턴스 생성 후 전체 플로우 동작 확인 (57/57)

### Phase 3: API Route Handlers

**단위 테스트**

- [x] `GET /api/restaurants/[id]/reviews` — 음식점 리뷰 목록 + 평균 별점 반환
- [x] `POST /api/restaurants/[id]/reviews` — 리뷰 생성 (userId, rating?, content?) → 201
- [x] `POST /api/restaurants/[id]/reviews` — 동일 유저 재작성 시 upsert → 200
- [x] `POST /api/restaurants/[id]/reviews` — rating, content 모두 없으면 → 400
- [x] `POST /api/restaurants/[id]/reviews` — rating 범위 초과 시 → 400
- [x] `POST /api/restaurants/[id]/reviews` — 존재하지 않는 restaurant → 404
- [x] `POST /api/restaurants/[id]/reviews` — 존재하지 않는 user → 400
- [x] `DELETE /api/restaurants/[id]/reviews` — 본인 리뷰 삭제 → 200
- [x] `DELETE /api/restaurants/[id]/reviews` — 리뷰 없으면 → 404
- [x] `GET /api/restaurants` — 응답에 avgRating 포함 확인

**통합 체크** (Phase 완료 시)

- [x] API → DB(in-memory) 전체 체인 동작 확인 (생성 → 조회 → 평균 계산)
- [x] `npx vitest run` 전체 테스트 통과 (66/66, 기존 restaurants 테스트 포함)

### Phase 4: Frontend — 음식점 상세 + 리뷰 UI

**단위 테스트**

- [x] 음식점 상세 페이지에서 설명(description) 렌더링 확인
- [x] 리뷰 목록 렌더링 (닉네임, 별점, 노트)
- [x] 평균 별점 표시 (별 아이콘 + 숫자)
- [x] 리뷰 작성 폼: 별점 선택 (1~5) + 노트 텍스트 입력
- [x] 리뷰 제출 시 API 호출 확인
- [x] 본인 리뷰가 있으면 수정 모드로 표시
- [x] 본인 리뷰 삭제 버튼 동작

**통합 체크** (Phase 완료 시)

- [x] 음식점 목록 → 상세 페이지 진입 → 리뷰 목록 로드 연결 확인
- [x] 리뷰 작성 → 목록 갱신 → 평균 별점 반영 확인
- [x] `npm run build` 빌드 성공

### Phase 5: Feature Documentation

> 구현 완료 후 `docs/features/` 문서를 생성 또는 업데이트한다.

- [x] 기능 문서 생성 또는 업데이트 (`docs/features/restaurant/reviews.md`)
- [x] `docs/features/index.md`에 누락된 항목 추가

---

## 진행 상황

| Phase   | 단위 | 통합 | 전체 | 진행률 |
| ------- | ---- | ---- | ---- | ------ |
| Phase 1 | 5/5  | 3/3  | 8/8  | 100%   |
| Phase 2 | 8/8  | 2/2  | 10/10| 100%   |
| Phase 3 | 10/10| 2/2  | 12/12| 100%   |
| Phase 4 | 7/7  | 3/3  | 10/10| 100%   |
| Phase 5 | 2/2  | —    | 2/2  | 100%   |

---

## 관련 파일

**소스 코드**

- `drizzle/schema.ts` — DB 스키마 (reviews 테이블 추가)
- `lib/domain/rating.ts` — Rating 값 객체 (신규)
- `lib/service/review-service.ts` — ReviewService (신규)
- `lib/service/review-repository.ts` — ReviewRepository 인터페이스 (신규)
- `lib/service/drizzle-review-repository.ts` — Drizzle 구현체 (신규)
- `app/api/restaurants/[id]/reviews/route.ts` — 리뷰 API (신규)
- `app/restaurants/[id]/page.tsx` — 음식점 상세 + 리뷰 페이지 (신규)

**테스트**

- `__tests__/domain/rating.test.ts` — Rating VO 테스트
- `__tests__/service/review-service.test.ts` — ReviewService 테스트
- `__tests__/api/reviews.test.ts` — 리뷰 API 테스트

---

## 커밋 히스토리

| 커밋 타입    | 설명 | 날짜 |
| ------------ | ---- | ---- |
| [BEHAVIORAL] |      |      |
| [STRUCTURAL] |      |      |

---

## 메모

- 기존 `restaurants.description` 필드는 이미 스키마에 존재 — 추가 마이그레이션 불필요
- 리뷰는 유저당 음식점당 1개 (upsert 패턴) — 별도 리뷰 ID로 여러 개 작성하는 모델이 아님
- 평균 별점은 DB에서 직접 계산 (AVG 쿼리) — 별도 캐시/materialized 불필요 (소규모 앱)
- restaurants 목록 API에 avgRating 추가 시 기존 테스트 호환성 확인 필요
