# StageSync — AI-Powered Real-Time Stage Management

> **StageSync** is an intelligent, real-time stage management system and AI copilot designed for live event organizers, emcees, and stage coordinators. It eliminates backstage chaos by synchronizing schedules across all devices with sub-millisecond precision, automatically cascading session delays with conflict prevention, and generating contextual stage transition scripts on demand.

---

## 🌟 Key Capabilities

### 1. 🎛️ Live Control Room Dashboard
- **On-Air Tracking**: Real-time display of the active speaker, countdown timer, and up-next sessions.
- **Dynamic Agenda Timeline**: Visual timeline with color-coded status badges (`LIVE`, `UPCOMING`, `DELAYED`, `COMPLETED`).
- **Kinetic 1:1 Physics-Based Navigation**: Native hardware-accelerated scrolling with sticky stage controls.
- **Keyboard Shortcuts**: Rapid actions for coordinators (`G` for Script Generator, `D` for Delay Session, `A` for Announcement, `?` for Shortcuts).

### 2. ⚡ Deterministic Cascade Delay Engine
- **Intelligent Reflow**: Applying a delay to an anchor session automatically recalculates and shifts all downstream agenda items.
- **Conflict & Boundary Guard**: Validates boundary limits and prevents midnight-crossing schedules with strict error envelopes (409 Conflict / 400 Bad Request).
- **Undo & Change Batching**: Full audit tracking with reversion capability.

### 3. 📡 Sub-Millisecond Real-Time Synchronization
- **Hybrid WebSocket + BroadcastChannel Sync**: Changes broadcast immediately across all open tabs, organizer laptops, and mobile screens via Socket.io and local browser channels.
- **Reconnect-Safe Architecture**: Automatically re-syncs state upon connection recovery.

### 4. 🎙️ AI Script Studio & Speech Synthesis
- **Context-Aware Scripting**: Generates opening speeches, speaker introductions, closing remarks, and delay transition scripts using Gemini / OpenAI.
- **Zero-Crash Offline Fallback**: Instantaneous fallback to pre-cached templates if the network or API key is unavailable (`⚡ Using cached template`).
- **Web Speech Synthesis**: Built-in "Read Aloud" audio playback directly inside the browser.

### 5. 🔄 1-Click Instant Demo Reset
- Reset the entire schedule back to pristine conference state in `< 1 second` (`POST /api/reset` or via the top-bar Reset button).

---

## 🏗️ Architecture & Monorepo Structure

```
Stage-sync/
├── apps/
│   ├── api/                  # NestJS 11 Backend (Port 4000)
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── agenda/   # Cascade delay engine & agenda CRUD
│   │   │   │   ├── ai/       # Script engine (Gemini/OpenAI + fallback)
│   │   │   │   ├── events/   # Event lifecycle & state management
│   │   │   │   ├── live/     # WebSocket Gateway (/live namespace)
│   │   │   │   ├── speakers/ # Speaker profiles & assignments
│   │   │   │   └── recovery/ # Demo reset & recovery utilities
│   │   │   └── common/       # RxJS ScheduleEventsPublisher & middleware
│   └── web/                  # Next.js 15 App Router Frontend (Port 3000)
│       ├── app/
│       │   ├── page.tsx      # Control room landing page
│       │   └── events/       # Live control room, scripts & setup
│       ├── components/       # Timeline, speaker cards, modals, toasts
│       ├── hooks/            # useLiveSync, useNow
│       ├── store/            # Zustand global stage store
│       └── styles/           # Design tokens, utility classes & CSS
├── packages/
│   ├── database/             # Prisma schema, migrations, PrismaClient service
│   └── shared/               # Shared TypeScript contracts & domain events
├── docker-compose.yml        # PostgreSQL (pgvector) + Redis
└── package.json              # Monorepo workspace orchestration
```

---

## 🚀 Quickstart & Local Setup

### Prerequisites
- **Node.js**: `v20+` or `v22+`
- **pnpm**: `v10+` (`corepack enable pnpm` or `npm i -g pnpm`)
- **Docker**: Docker Desktop (for PostgreSQL & Redis)

### 1. Clone & Install
```bash
git clone https://github.com/yugtrambadiya/Stage-sync.git
cd Stage-sync
pnpm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
*(Optional: Add `GEMINI_API_KEY="your-key"` or `OPENAI_API_KEY="your-key"` for live AI script generation. If omitted, built-in fallback scripts are used automatically without errors).*

### 3. Start Infrastructure
Start the PostgreSQL and Redis containers:
```bash
docker compose up -d
```

### 4. Database Setup & Seeding
Generate Prisma Client, apply database migrations, and seed initial conference data (*TechNova 2025*):
```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

### 5. Launch Development Servers
Run both the NestJS API and Next.js Web applications in parallel:
```bash
pnpm dev
```
- **Web Application**: [http://localhost:3000](http://localhost:3000)
- **Live Control Room**: [http://localhost:3000/events/evt_technova_2025/live](http://localhost:3000/events/evt_technova_2025/live)
- **Backend API**: [http://localhost:4000](http://localhost:4000)
- **Interactive Swagger Docs**: [http://localhost:4000/docs](http://localhost:4000/docs)

---

## 🧪 Testing & Verification

Run monorepo-wide typechecking and unit test suites:
```bash
# Typecheck all packages and apps
pnpm typecheck

# Run unit tests (Cascade Delay Engine)
pnpm test
```

---

## 🎬 Judging Demo Walkthrough (5-Minute Script)

1. **The Smooth Show**:
   - Open [http://localhost:3000/events/evt_technova_2025/live](http://localhost:3000/events/evt_technova_2025/live).
   - Point out the active keynote on stage, the countdown timer, the next speaker up, and the on-time indicator (`ON TIME`).
2. **The Crisis (Simulate a Delay)**:
   - Click **"Mark Delay"** on the keynote session.
   - Enter `+15 min` with reason *"Speaker travel delay"* and confirm.
   - Notice how all downstream sessions instantly shift forward by 15 minutes, the drift pill updates to `+15 MIN DRIFT`, and an on-air audit entry is logged.
3. **Multi-Window Synchronization**:
   - Open the same URL in a second browser window.
   - Notice that changes made in one window immediately reflect in the other with sub-millisecond latency over WebSockets.
4. **The Recovery (AI Stage Copilot)**:
   - Click **"Generate Script"** on any session transition.
   - Watch the script generate instantly.
   - Click **"Read Aloud"** to hear the browser's speech synthesis speak the announcement script.
5. **Instant Reset**:
   - Click **"Reset"** in the top navigation bar.
   - The database restores to the original schedule in `< 1 second`.

---

## 🛡️ Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript, Zustand, Vanilla CSS Design System.
- **Backend**: NestJS 11, TypeScript, Socket.io, RxJS, Swagger/OpenAPI, Class Validator.
- **Database & Cache**: PostgreSQL 17 (pgvector), Prisma ORM, Redis 7.
- **AI Engine**: Google Gemini API / OpenAI API with fallback script engine.
- **Tooling**: pnpm workspaces, Vitest, Jest, Docker.
