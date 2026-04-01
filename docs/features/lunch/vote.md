# 점심 메뉴 투표

직원들이 브라우저로 접속하여 DB에 등록된 음식점을 검색·선택하여 투표하고, 개봉 시간 이후 결과를 확인하는 기능.

## 사용법

1. 호스트 PC에서 `npm run dev -- -H 0.0.0.0` 실행
2. 직원들은 브라우저에서 `http://<호스트IP>:3000` 접속
3. 투표 세션 생성 → 음식점 검색(autocomplete) → 선택·추가 → 투표
4. 개봉 시간(기본 12:55 KST) 이후 결과 확인
5. 당첨 음식점 방문 확정 시 winCount 누적

## API 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/sessions?page=N` | 세션 목록 조회 (5개씩 페이지네이션) |
| POST | `/api/sessions` | 새 세션 생성 (`title`, `revealAt` 선택) |
| GET | `/api/sessions/[id]/menu` | 메뉴(음식점) 목록 조회 |
| POST | `/api/sessions/[id]/menu` | 음식점 추가 (`restaurantId`) |
| POST | `/api/sessions/[id]/vote` | 투표 |
| GET | `/api/sessions/[id]/results` | 결과 조회 (revealAt 이후만) |
| PATCH | `/api/sessions/[id]/close` | 세션 종료 |
| POST | `/api/sessions/[id]/confirm` | 방문 확정 (winCount +1, lunch_history 기록) |
| GET | `/api/restaurants/search?q=` | 음식점 검색 (LIKE 자동완성) |
| GET | `/api/lunch-history` | 방문 히스토리 조회 |

## 비즈니스 규칙

- 1인 1표 (같은 세션에서 중복 투표 불가)
- 종료된 세션에는 투표 불가
- 세션 제목은 비어있을 수 없음
- DB에 등록된 음식점만 추가 가능 (자유 텍스트 불가)
- 같은 세션에 같은 음식점 중복 추가 불가
- 투표 결과는 `revealAt` (기본 12:55 KST) 이후에만 공개
- 방문 확정은 revealAt 이후, 1회만 가능

## DB 테이블

- `vote_sessions`: 투표 세션 (id, title, status, reveal_at, confirmed_at, created_at)
- `menu_items`: 메뉴 후보 (id, session_id, restaurant_id, name)
- `votes`: 투표 (id, session_id, menu_item_id, user_id, created_at)
- `restaurants`: 음식점 (id, name, category, description, photo_path, win_count, ...)
- `lunch_history`: 방문 기록 (id, session_id, restaurant_id, visited_at)

## 변경 이력

| 날짜 | 내용 |
|------|------|
| 2026-04-01 | 음식점 연동, revealAt, 방문 확정, 페이지네이션, autocomplete 추가 |
