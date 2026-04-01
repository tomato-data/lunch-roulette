# 식당 관리

점심 투표 및 룰렛에서 공통으로 사용할 식당 정보를 관리하는 기능.

## 기능

- **식당 CRUD**: 식당 추가, 조회, 수정, 삭제
- **사진 업로드**: 식당 사진을 로컬에 저장하고 표시
- **카테고리**: 한식, 중식, 일식, 양식 등 자유 입력

## 페이지

- `/restaurants` — 식당 관리 페이지 (카드 그리드 ���이아웃)

## API 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/restaurants` | 전체 식당 목록 |
| POST | `/api/restaurants` | 식당 추가 (JSON: name, category?, description?) |
| PUT | `/api/restaurants/[id]` | 식당 수정 |
| DELETE | `/api/restaurants/[id]` | 식당 삭제 (사진 파일도 정리) |
| POST | `/api/restaurants/[id]/photo` | 사진 업로드 (FormData: photo) |

## DB 테이블

```sql
restaurants (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  category    TEXT,
  description TEXT,
  photo_path  TEXT,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
)
```

## 사진 저장

- 저장 위치: `public/uploads/restaurants/`
- DB에는 파일명만 저장 (예: `1711987200000-abc1234.jpg`)
- 브라우저 접근: `/uploads/restaurants/{filename}`
- 식당 삭제 시 사진 파일도 함께 삭제
