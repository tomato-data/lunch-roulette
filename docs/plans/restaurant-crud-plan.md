# Restaurant CRUD TDD Plan

> 점심 투표 및 룰렛에서 공통으로 사용할 식당 정보를 DB에 저장하고, 프론트엔드에서 추가/수정/삭제 + 사진 표시

**도메인**: lunch-roulette
**생성일**: 2026-04-01
**상태**: ~~IN_PROGRESS~~ COMPLETED
**완료일**: 2026-04-01

---

## 요구사항 요약

1. **식당 정보 DB 테이블**: 이름, 카테고리(한식/중식/일식/양식 등), 설명, 사진 경로 저장
2. **CRUD API**: 식당 추가(POST), 목록 조회(GET), 수정(PUT), 삭제(DELETE)
3. **사진 업로드**: 로컬 파일시스템에 사진 저장, DB에는 경로만 기록
4. **프론트엔드**: 식당 관리 페이지 — 목록(사진 포함), 추가 폼, 수정 폼, 삭제 기능
5. **향후 연동**: lunch vote의 메뉴 후보와 lunch roulette에서 이 식당 데이터를 참조할 예정 (이번 scope에서는 독립 엔티티로 구현)

**제약 사항**:
- 로컬 전용 — 사진은 `public/uploads/restaurants/`에 저장, Next.js 정적 파일 서빙 활용
- SQLite 단일 파일 DB (기존 `data/lunch-roulette.db` 공유)
- 별도 인증 없음

---

## Forces Analysis

### 변동 식별

| 변동 요소 | 변경 주기/이유 | 독립성 |
|----------|--------------|--------|
| 식당 정보 (이름, 카테고리, 설명) | 식당 추가/폐업 시 수시 변경 | 독립 |
| 사진 | 식당 정보 변경 시 함께 변경 | 식당에 종속 |
| 카테고리 종류 | 거의 변하지 않음 | 없음 |

### 패턴 신호 진단

| 신호 | 현재 상태 | 판단 |
|------|----------|------|
| 독립적 변동이 3개+ 있는가? | 아니오 | - |
| 단계들이 함께 변하는가? | 아니오 | - |
| 순서/개수가 가변인 선택적 단계? | 아니오 | - |
| 런타임까지 결정이 불확실한가? | 아니오 | - |
| 비즈니스적으로 무효한 조합? | 아니오 | - |
| **Force가 아직 없는가?** | **예** | → **단순 유지** |

**결론**: 패턴 불필요. 순수 CRUD + 파일 업로드. 비즈니스 로직 없이 데이터 관리에 집중.

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
| `Restaurant` (DB row) | 개체(Entity) | id로 식별, 이름/카테고리/사진 등 변경 가능 |
| `CreateRestaurantRequest` | DTO | API 경계 입력값 (이름, 카테고리, 설명) |
| `UpdateRestaurantRequest` | DTO | API 경계 입력값 (부분 수정) |
| `generatePhotoFilename()` | 유틸리티 함수 | 무상태, 고유 파일명 생성 |

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
| **Drizzle Schema / DB 쿼리** | 부적합 (통합 테스트) | 함수의 행위 = DB 쿼리 자체. Mock하면 mock tautology |
| **Photo 유틸리티** | 적합 (순수 함수) | 파일명 생성, 경로 해석은 외부 의존성 없는 순수 로직 |
| **API Route Handler** | 적합 (인메모리 DB 통합) | 요청 파싱 + DB 연결 + 응답 직렬화 검증 |
| **Frontend 컴포넌트** | 통합 체크 (수동) | 로컬 전용 앱, 브라우저 확인으로 충분 |

### 의존성 분류

| 의존성 | 유형 | 테스트 대역 | 검증 방식 |
|--------|------|-----------|----------|
| DB (Drizzle queries) | 시스템 경계 | 인메모리 SQLite | 통합 테스트에서 실제 DB 사용 |
| 파일시스템 (사진 저장) | 시스템 경계 | 임시 디렉토리 | 통합 테스트에서 실제 파일 I/O |

### 생성자 테스트 범위

| 객체 | 실패 테스트 | happy path |
|------|-----------|------------|
| Restaurant (DB insert) | 빈 이름 → DB NOT NULL 제약 | API 통합 테스트에서 커버 |

### 상태 변경 검증 방식

| 개체 | 변경자 | 검증 방식 |
|------|--------|----------|
| Restaurant | update (name, category, etc.) | DB 재조회로 변경 확인 |
| Restaurant | delete | DB 조회 시 null 확인 |

---

## 값 객체 후보 (Primitive Obsession 검토)

해당 없음 (📖 Read: obj-extract-value-object.md, obj-extract-composite.md 확인 완료)

식당 데이터의 필드들(name, category, description, photoPath)은 각각 독립적인 단순 문자열이며, 함께 반복 출현하는 원시값 클러스터가 없음.
- `category`는 enum 후보이나 현재 자유 입력으로 충분 (식당 수가 적고 로컬 전용)
- `photoPath`는 단일 문자열로, 검증 로직 반복이 예상되지 않음

REFACTOR 단계에서 재평가.

---

## 기존 테스트 영향 분석

| 변경 유형 | grep 패턴 | 영향 예상 |
|----------|----------|----------|
| 새 테이블 추가 (restaurants) | `createTestDb` in `__tests__/` | `createTestDb()` 함수에 `restaurants` 테이블 CREATE 구문 추가 필요 |

기존 테스트의 로직은 변경되지 않으나, 통합 테스트에서 공유하는 `createTestDb()` 헬퍼를 확장해야 함. 기존 테스트 동작에는 영향 없음 (restaurants 테이블은 기존 테이블과 FK 관계 없음).

---

## TDD 테스트 계획

### Phase 1: DB Schema

> Drizzle 스키마에 `restaurants` 테이블 추가, DB 반영 확인

**단위 테스트**

- 단위 테스트 없음 (스키마 정의는 단위 테스트 부적합)

**통합 체크** (Phase 완료 시)

- [x] `npm run db:push`로 restaurants 테이블 생성 확인
- [x] Drizzle Studio 또는 직접 쿼리로 restaurants 테이블 컬럼 확인 (id, name, category, description, photo_path, created_at, updated_at)

### Phase 2: Photo 유틸리티

> 사진 파일명 생성, 경로 해석, 파일 저장/삭제 유틸리티

**단위 테스트**

- [x] `test_generate_photo_filename_is_unique`: 호출할 때마다 고유한 파일명 생성
- [x] `test_generate_photo_filename_preserves_extension`: 원본 파일의 확장자 유지 (.jpg, .png 등)
- [x] `test_get_photo_url_returns_public_path`: DB 저장 경로 → 브라우저 접근 가능 URL 변환

**통합 체크** (Phase 완료 시)

- [x] `public/uploads/restaurants/` 디렉토리 생성 완료 (.gitkeep 포함)
- [x] 저장된 파일이 Next.js 정적 서빙으로 브라우저 접근 가능 (`public/uploads/restaurants/` → `/uploads/restaurants/` URL)

### Phase 3: API Routes (CRUD + Photo Upload)

> 식당 CRUD REST API + 사진 업로드 엔드포인트

**단위 테스트** (인메모리 DB 통합)

- [x] `GET /api/restaurants` → 200 + 빈 배열 (초기 상태)
- [x] `POST /api/restaurants` → 201 + 생성된 식당 반환 (이름, 카테고리)
- [x] `GET /api/restaurants` → 200 + 생성된 식당 목록 포함
- [x] `PUT /api/restaurants/[id]` → 200 + 수정된 식당 반환
- [x] `PUT /api/restaurants/[id]` 존재하지 않는 id → 404
- [x] `DELETE /api/restaurants/[id]` → 200 + 삭제 확인
- [x] `DELETE /api/restaurants/[id]` 존재하지 않는 id → 404
- [x] `POST /api/restaurants` 빈 이름 → 400 에러

**통합 체크** (Phase 완료 시)

- [x] curl/브라우저로 식당 생성 → 조회 → 수정 → 삭제 전체 플로우 동작 확인 (인메모리 DB 통합 테스트로 검증 완료)
- [x] 사진 업로드 포함한 식당 생성 → 사진 URL 접근 가능 확인 (photo upload API + 프론트엔드 구현 완료)
- [x] 식당 삭제 시 연관 사진 파일도 정리되는지 확인 (DELETE route에서 deletePhoto 호출)

### Phase 4: Frontend — 식당 관리 UI

> 식당 목록 표시(사진 포함), 추가/수정/삭제 폼

**단위 테스트**

- 단위 테스트 없음 (로컬 전용 앱, 수동 통합 체크로 충분)

**통합 체크** (Phase 완료 시)

- [x] 식당 목록 페이지에서 등록된 식당들이 사진과 함께 표시
- [x] 식당 추가 폼: 이름(필수), 카테고리, 설명, 사진 업로드 → 저장 후 목록에 반영
- [x] 식당 수정: 기존 정보 로드 → 변경 → 저장 → 목록에 반영
- [x] 식당 삭제: 확인 후 삭제 → 목록에서 제거
- [x] 사진 없는 식당도 기본 플레이스홀더로 정상 표시 (🍽️ 이모지)
- [x] 반응형 레이아웃 확인 (카드/그리드 형태, auto-fill minmax)

### Phase 5: Feature Documentation

> 구현 완료 후 기능 문서를 생성 또는 업데이트한다.

- [x] 기능 문서 생성 (`docs/features/lunch/restaurant.md`)
- [x] `docs/features/index.md`에 식당 관리 항목 추가

---

## 진행 상황

| Phase   | 단위 | 통합 | 전체 | 진행률 |
| ------- | ---- | ---- | ---- | ------ |
| Phase 1 | 0/0  | 2/2  | 2/2  | 100%   |
| Phase 2 | 3/3  | 2/2  | 5/5  | 100%   |
| Phase 3 | 8/8  | 3/3  | 11/11| 100%   |
| Phase 4 | 0/0  | 6/6  | 6/6  | 100%   |
| Phase 5 | 0/0  | 2/2  | 2/2  | 100%   |

---

## 관련 파일

**소스 코드**

- `drizzle/schema.ts` — DB 스키마 (restaurants 테이블 추가)
- `lib/photo.ts` — 사진 파일 유틸리티 (신규)
- `app/api/restaurants/route.ts` — GET, POST (신규)
- `app/api/restaurants/[id]/route.ts` — PUT, DELETE (신규)
- `app/restaurants/page.tsx` — 식당 관리 페이지 (신규)
- `public/uploads/restaurants/` — 사진 저장 디렉토리 (신규)

**테스트**

- `__tests__/lib/photo.test.ts` — 사진 유틸리티 단위 테스트 (신규)
- `__tests__/api/restaurants.test.ts` — API 통합 테스트 (신규)

---

## 커밋 히스토리

| 커밋 타입    | 설명 | 날짜 |
| ------------ | ---- | ---- |
| [BEHAVIORAL] |      |      |
| [STRUCTURAL] |      |      |

---

## 메모

- **사진 저장 방식**: `public/uploads/restaurants/`에 저장 → Next.js가 `/uploads/restaurants/filename.jpg`로 자동 서빙. DB에는 `/uploads/restaurants/filename.jpg` 형태의 상대 경로 저장.
- **기존 menuItems와의 관계**: 이번 scope에서는 restaurants를 독립 엔티티로 구현. 향후 lunch vote에서 메뉴 후보 추가 시 restaurants 데이터를 참조하거나, lunch roulette에서 랜덤 선택 대상으로 활용하는 연동은 별도 feature로 진행.
- **카테고리**: 자유 텍스트 입력. 식당 수가 적고 로컬 전용이므로 enum 제약 불필요. 추후 필요 시 REFACTOR.
- **`createTestDb()` 헬퍼 확장**: Phase 3에서 API 통합 테스트 작성 시, 기존 `__tests__/api/sessions.test.ts`의 `createTestDb()` 패턴을 따르되, restaurants 테이블 CREATE 구문을 추가한 별도 헬퍼 또는 공유 헬퍼로 확장.
