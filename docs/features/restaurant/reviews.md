# 음식점 리뷰 / 평가

유저별로 각 음식점에 대한 노트와 별점(1~5)을 남길 수 있는 기능.

## 주요 기능

- **별점 평가**: 1~5 별점 선택 (선택사항)
- **노트 작성**: 자유 텍스트 메모 (선택사항)
- **Upsert**: 유저당 음식점당 1개의 리뷰만 존재하며, 재작성 시 업데이트
- **평균 별점**: 음식점 목록 및 상세 페이지에 평균 별점 표시
- **삭제**: 본인 리뷰 삭제 가능

## API 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/restaurants/[id]/reviews` | 리뷰 목록 + 평균 별점 |
| POST | `/api/restaurants/[id]/reviews` | 리뷰 생성/수정 (upsert) |
| DELETE | `/api/restaurants/[id]/reviews` | 본인 리뷰 삭제 |

## 데이터 모델

- `reviews` 테이블: `id`, `restaurant_id` (FK), `user_id` (FK), `rating` (nullable), `content` (nullable), timestamps
- `Rating` 값 객체: 1~5 정수 범위 제한

## 페이지

- `/restaurants/[id]` — 음식점 상세 + 리뷰 목록 + 리뷰 작성 폼
- `/restaurants` — 목록에 평균 별점 표시, 상세 페이지 링크
