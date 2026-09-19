# Stage-sync — AI Stage Copilot

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
- GitHub Actions
- pnpm monorepo

## Core Modules

- Event & agenda management
- Speaker/guest management
- AI opening scripts
- AI speaker introductions
- AI transition scripts
- AI closing scripts
- Live dashboard
- Dynamic agenda updates
- AI delay/recovery engine
- Emergency announcements
- Event memory / RAG
- Audit log

## Local Setup

```bash
pnpm install
docker compose up -d
cp .env.example .env
pnpm db:generate
pnpm db:migrate
pnpm dev