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


## Sequence of Commands to setup project 

# 1. Clone the repository
git clone <YOUR_GITHUB_REPO_URL>
cd Stage-sync

# 2. Install all workspace dependencies
pnpm install

# 3. Create root .env from example
cp .env.example .env

# 4. Create database package .env
cp .env.example packages/database/.env

# 5. Start PostgreSQL and Redis containers in Docker (runs on port 5433)
docker compose up -d

# 6. Generate Prisma client & sync schema with the database
pnpm --filter @smart-anchor/database prisma db push

# 7. Start both Frontend (Next.js) & Backend API (NestJS)
pnpm run dev
