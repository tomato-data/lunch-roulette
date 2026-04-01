# Lunch Roulette

회사에서 재미삼아 사용하는 점심메뉴 룰렛 앱.

## Tech Stack

- **Frontend + Backend**: Next.js (App Router)
- **Language**: TypeScript
- **Database**: SQLite (Drizzle ORM)
- **Styling**: 추후 결정

## Project Structure

```
app/           # Next.js App Router (pages + API routes)
data/          # SQLite DB 파일
drizzle/       # DB schema, migrations
```

## Conventions

- JSON으로 시작하되, 투표/히스토리 등 기능 확장 시 SQLite 사용
- API는 Next.js Route Handlers로 처리 (별도 백엔드 없음)
- 단일 TypeScript 스택 유지

## Commands

```bash
npm run dev      # 개발 서버
npm run build    # 프로덕션 빌드
npm run db:push  # DB 스키마 반영
```
