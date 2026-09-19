# Smart Anchor — AI Stage Copilot

AI-powered real-time event control room for anchors and organizers.

## Stack

- Next.js + React + TypeScript
- NestJS + TypeScript
- Prisma ORM
- PostgreSQL + pgvector
- Redis
- WebSockets
- AI structured workflows
- Docker
- pnpm monorepo

## Core modules

- Event & agenda management
- Speaker/guest management
- AI opening scripts
- AI speaker introductions
- AI transition scripts
- AI closing scripts
- Live dashboard
- Dynamic agenda updates
- Delay/recovery engine
- Emergency announcements
- Event memory / RAG
- Audit log

## Local setup

```bash
pnpm install
docker compose up -d
cp .env.example .env
pnpm db:generate
pnpm db:migrate
pnpm dev
```

Web: http://localhost:3000  
API: http://localhost:4000

## Git workflow

`main` is production and must be protected.

```text
feature/* -> PR -> develop -> PR -> main
fix/*     -> PR -> develop -> PR -> main
```

Never push directly to `main`.
