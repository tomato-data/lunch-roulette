# 점심 메뉴 투표

직원들이 브라우저로 접속하여 점심 메뉴에 투표하고, 결과를 확인하는 기능.

## 사용법

1. 호스트 PC에서 `npm run dev -- -H 0.0.0.0` 실행
2. 직원들은 브라우저에서 `http://<호스트IP>:3000` 접속
3. 투표 세션 생성 → 메뉴 추가 → 이름 입력 → 투표

## API 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/sessions` | 세션 목록 조회 |
| POST | `/api/sessions` | 새 세션 생성 |
| GET | `/api/sessions/[id]/menu` | 메뉴 목록 조회 |
| POST | `/api/sessions/[id]/menu` | 메뉴 추가 |
| POST | `/api/sessions/[id]/vote` | 투표 |
| GET | `/api/sessions/[id]/results` | 결과 조회 |
| PATCH | `/api/sessions/[id]/close` | 세션 종료 |

## 비즈니스 규칙

- 1인 1표 (같은 세션에서 중복 투표 불가)
- 종료된 세션에는 투표 불가
- 세션 제목은 비어있을 수 없음

## DB 테이블

- `vote_sessions`: 투표 세션 (id, title, status, created_at)
- `menu_items`: 메뉴 후보 (id, session_id, name)
- `votes`: 투표 (id, session_id, menu_item_id, voter_name, created_at)
