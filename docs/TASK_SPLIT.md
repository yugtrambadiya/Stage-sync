# Stage-sync — Hackathon Task Split (PS-5)

> **AI Agent Instructions:** This document is the single source of truth for task assignment.
> Read the entire file before starting. Your branch, scope, files, and acceptance criteria are all listed here.
> Never touch files outside your assigned scope. Never commit to `main` or `develop` directly.
> All work goes on your designated `feature/*` branch → PR into `develop`.

---

## Repo Layout (Current State)

```
Stage-sync/                          ← monorepo root
├── apps/
│   ├── api/                         ← NestJS 10 backend (port 4000)
│   │   └── src/
│   │       ├── main.ts
│   │       ├── app.module.ts
│   │       ├── health.controller.ts
│   │       └── modules/
│   │           ├── events/          ← STUB
│   │           ├── agenda/          ← STUB
│   │           ├── speakers/        ← STUB
│   │           ├── ai/              ← STUB
│   │           ├── live/            ← STUB (ping/pong only)
│   │           ├── announcements/   ← STUB
│   │           └── recovery/        ← STUB
│   └── web/                         ← Next.js 15 App Router (port 3000)
│       ├── app/
│       └── components/
├── packages/
│   ├── database/                    ← Prisma schema (fully modelled)
│   ├── ai/                          ← empty
│   └── shared/                      ← empty
├── docs/
│   ├── ARCHITECTURE.md
│   ├── GIT_WORKFLOW.md
│   └── TASK_SPLIT.md                ← THIS FILE
├── docker-compose.yml
├── .env.example
└── package.json                     ← root scripts
```

## Environment Variables (all agents must know these)

```
DATABASE_URL=postgresql://smart_anchor:smart_anchor@localhost:5432/smart_anchor?schema=public
REDIS_URL=redis://localhost:6379
OPENAI_API_KEY=<real key>
AUTH_SECRET=<long random string>
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_WS_URL=ws://localhost:4000
```

Copy `.env.example` → `.env` and fill real values before running anything.

## Shared Commands (run from repo root)

| Command | Purpose |
|---|---|
| `docker-compose up -d` | Start Postgres + Redis |
| `pnpm db:migrate` | Apply Prisma migrations |
| `pnpm db:generate` | Generate Prisma client |
| `pnpm dev` | Start api (:4000) + web (:3000) in parallel |
| `pnpm db:seed` | Seed realistic conference data (after Teammate 1 builds it) |
| `pnpm db:reset` | Drop + re-seed (demo reset) |

## Branch Strategy — STRICT

```
main        ← NEVER touch
develop     ← merge target via PR only
feature/*   ← all work here
```

### The four branches

| Branch | Owner | Nickname |
|---|---|---|
| `feature/backend-core` | Teammate 1 | **Backend Core** |
| `feature/backend-ai-ws` | Teammate 2 | **AI + WebSocket** |
| `feature/frontend-dashboard` | Teammate 3 | **Frontend Dashboard** |
| `feature/frontend-ui-system` | Teammate 4 | **Frontend UI System + Polish** |

---

---

# TEAMMATE 1 — Backend Core

**Branch:** `feature/backend-core`
**Merges into:** `develop` via PR
**Scope:** Events CRUD · Agenda CRUD + cascade delay · Speakers CRUD · Shared PrismaService · Seed data · Reset endpoint

---

## Step 0 — Branch Setup

```bash
git fetch origin
git checkout develop
git pull origin develop
git checkout -b feature/backend-core
```

---

## Step 1 — Shared PrismaService

**File to create:** `packages/database/src/prisma.service.ts`

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

**File to create:** `packages/database/src/index.ts`

```typescript
export { PrismaService } from './prisma.service';
```

---

## Step 2 — Events Module (replace stub)

### `apps/api/src/modules/events/dto/create-event.dto.ts`

```typescript
import { IsString, IsNotEmpty, IsDateString, IsOptional } from 'class-validator';

export class CreateEventDto {
  @IsString() @IsNotEmpty()
  name: string;

  @IsString() @IsOptional()
  description?: string;

  @IsDateString()
  startTime: string;

  @IsDateString()
  endTime: string;

  @IsString() @IsOptional()
  venue?: string;
}
```

### `apps/api/src/modules/events/dto/update-event.dto.ts`

```typescript
import { PartialType } from '@nestjs/mapped-types';
import { CreateEventDto } from './create-event.dto';
export class UpdateEventDto extends PartialType(CreateEventDto) {}
```

### `apps/api/src/modules/events/events.service.ts`

Replace stub with full Prisma CRUD:

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@smart-anchor/database';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

@Injectable()
export class EventsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.event.findMany({
      include: { agendaItems: { orderBy: { scheduledStart: 'asc' } }, speakers: true },
    });
  }

  findOne(id: string) {
    return this.prisma.event.findUniqueOrThrow({ where: { id } });
  }

  create(dto: CreateEventDto) {
    return this.prisma.event.create({ data: dto });
  }

  update(id: string, dto: UpdateEventDto) {
    return this.prisma.event.update({ where: { id }, data: dto });
  }

  remove(id: string) {
    return this.prisma.event.delete({ where: { id } });
  }
}
```

### `apps/api/src/modules/events/events.controller.ts`

```typescript
import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()    findAll()              { return this.eventsService.findAll(); }
  @Get(':id') findOne(@Param('id') id: string) { return this.eventsService.findOne(id); }
  @Post()   create(@Body() dto: CreateEventDto)  { return this.eventsService.create(dto); }
  @Put(':id') update(@Param('id') id: string, @Body() dto: UpdateEventDto) { return this.eventsService.update(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.eventsService.remove(id); }
}
```

### `apps/api/src/modules/events/events.module.ts`

Add PrismaService:

```typescript
import { Module } from '@nestjs/common';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { PrismaService } from '@smart-anchor/database';

@Module({
  controllers: [EventsController],
  providers: [EventsService, PrismaService],
  exports: [EventsService],
})
export class EventsModule {}
```

---

## Step 3 — Agenda Module (most critical — cascade delay logic)

### `apps/api/src/modules/agenda/dto/create-agenda-item.dto.ts`

```typescript
import { IsString, IsNotEmpty, IsDateString, IsNumber, IsOptional } from 'class-validator';

export class CreateAgendaItemDto {
  @IsString() @IsNotEmpty() title: string;
  @IsString() @IsOptional() description?: string;
  @IsDateString() scheduledStart: string;
  @IsNumber() durationMinutes: number;
  @IsString() eventId: string;
  @IsString() @IsOptional() speakerId?: string;
}
```

### `apps/api/src/modules/agenda/dto/delay-agenda-item.dto.ts`

```typescript
import { IsNumber, Min } from 'class-validator';

export class DelayAgendaItemDto {
  @IsNumber() @Min(1)
  delayMinutes: number;
}
```

### `apps/api/src/modules/agenda/agenda.service.ts`

```typescript
import { Injectable, ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@smart-anchor/database';
import { CreateAgendaItemDto } from './dto/create-agenda-item.dto';
import { DelayAgendaItemDto } from './dto/delay-agenda-item.dto';

@Injectable()
export class AgendaService {
  constructor(private prisma: PrismaService) {}

  findByEvent(eventId: string) {
    return this.prisma.agendaItem.findMany({
      where: { eventId },
      orderBy: { scheduledStart: 'asc' },
      include: { speaker: true },
    });
  }

  create(dto: CreateAgendaItemDto) {
    return this.prisma.agendaItem.create({ data: dto });
  }

  async cascadeDelay(agendaItemId: string, dto: DelayAgendaItemDto) {
    const { delayMinutes } = dto;
    const target = await this.prisma.agendaItem.findUnique({ where: { id: agendaItemId } });
    if (!target) throw new NotFoundException(`AgendaItem ${agendaItemId} not found`);

    // Fetch all items in the same event at or after the target's start time
    const affectedItems = await this.prisma.agendaItem.findMany({
      where: {
        eventId: target.eventId,
        scheduledStart: { gte: target.scheduledStart },
      },
      orderBy: { scheduledStart: 'asc' },
    });

    const diff: { itemId: string; oldStart: Date; newStart: Date }[] = [];

    for (const item of affectedItems) {
      const oldStart = new Date(item.scheduledStart);
      const newStart = new Date(oldStart.getTime() + delayMinutes * 60 * 1000);

      // Validate: slot must not cross midnight (date must stay the same)
      if (newStart.toDateString() !== oldStart.toDateString()) {
        throw new BadRequestException(
          `Delay would push item "${item.title}" past midnight. Reduce the delay or reschedule manually.`,
        );
      }

      diff.push({ itemId: item.id, oldStart, newStart });

      await this.prisma.agendaItem.update({
        where: { id: item.id },
        data: { scheduledStart: newStart, status: item.id === agendaItemId ? 'DELAYED' : item.status },
      });
    }

    // Validate no overlaps after cascade (fetch fresh)
    const updated = await this.prisma.agendaItem.findMany({
      where: { eventId: target.eventId },
      orderBy: { scheduledStart: 'asc' },
    });

    for (let i = 0; i < updated.length - 1; i++) {
      const a = updated[i];
      const b = updated[i + 1];
      const aEnd = new Date(new Date(a.scheduledStart).getTime() + a.durationMinutes * 60 * 1000);
      if (aEnd > new Date(b.scheduledStart)) {
        throw new ConflictException({
          message: `Overlap detected between "${a.title}" and "${b.title}" after cascade`,
          diff,
        });
      }
    }

    return { success: true, delayMinutes, itemsAffected: diff.length, diff };
  }
}
```

### `apps/api/src/modules/agenda/agenda.controller.ts`

```typescript
import { Controller, Get, Post, Param, Body, Patch } from '@nestjs/common';
import { AgendaService } from './agenda.service';
import { CreateAgendaItemDto } from './dto/create-agenda-item.dto';
import { DelayAgendaItemDto } from './dto/delay-agenda-item.dto';

@Controller('agenda')
export class AgendaController {
  constructor(private readonly agendaService: AgendaService) {}

  @Get('event/:eventId')
  findByEvent(@Param('eventId') eventId: string) {
    return this.agendaService.findByEvent(eventId);
  }

  @Post()
  create(@Body() dto: CreateAgendaItemDto) {
    return this.agendaService.create(dto);
  }

  @Patch(':id/delay')
  cascadeDelay(@Param('id') id: string, @Body() dto: DelayAgendaItemDto) {
    return this.agendaService.cascadeDelay(id, dto);
  }
}
```

### `apps/api/src/modules/agenda/agenda.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { AgendaService } from './agenda.service';
import { AgendaController } from './agenda.controller';
import { PrismaService } from '@smart-anchor/database';

@Module({
  controllers: [AgendaController],
  providers: [AgendaService, PrismaService],
  exports: [AgendaService],
})
export class AgendaModule {}
```

---

## Step 4 — Speakers Module

### `apps/api/src/modules/speakers/dto/create-speaker.dto.ts`

```typescript
import { IsString, IsNotEmpty, IsOptional, IsEmail } from 'class-validator';

export class CreateSpeakerDto {
  @IsString() @IsNotEmpty() name: string;
  @IsString() @IsOptional() bio?: string;
  @IsString() @IsOptional() organization?: string;
  @IsString() @IsOptional() topic?: string;
  @IsEmail() @IsOptional() email?: string;
  @IsString() eventId: string;
}
```

Build `speakers.service.ts`, `speakers.controller.ts`, and `speakers.module.ts` following the same CRUD pattern as the Events module above (findAll, findOne, create, update, remove — all wired to `this.prisma.speaker`).

---

## Step 5 — Seed Data

### `apps/api/src/seed/seed.ts`

Create a complete, realistic seed script for a college tech fest called **TechFest 2025**.

**Speakers to seed (10 total):**

| Name | Organization | Topic | Bio |
|---|---|---|---|
| Dr. Rohan Verma | IIT Bombay | AI at the Edge | Professor of ML, 15 years research, author of 3 textbooks |
| Ananya Krishnan | Flipkart | WebAssembly in Production | Senior engineer, shipped WASM to 50M users |
| Kiran Desai | Google | Building with LLMs | Developer advocate, ex-startup founder |
| Meera Joshi | Mozilla | Open Source Careers | FOSS contributor since 2012 |
| Arjun Malhotra | Razorpay | Startup Realities | Co-founder, scaled from 0 to Series B |
| Priya Mehta | Zomato | Startup Realities | CTO, built ML pipeline for recommendations |
| Siddharth Rao | Postman | Startup Realities | Head of Product, first PM at Postman India |
| Dr. S. Patel | College Director | Closing Ceremony | Director, 20 years in academia |
| Organizing Committee | TechFest | Opening Ceremony | Student committee |
| Jury Panel | TechFest | Hackathon Results | Judges and evaluators |

**Agenda to seed (full day schedule):**

| Time | Duration | Title | Speaker | Status |
|---|---|---|---|---|
| 09:00 | 30 min | Opening Ceremony | Organizing Committee | UPCOMING |
| 09:30 | 60 min | Keynote: AI at the Edge | Dr. Rohan Verma | **DELAYED** |
| 10:30 | 60 min | Talk: WebAssembly in Production | Ananya Krishnan | UPCOMING |
| 11:30 | 30 min | Panel: Startup Realities | Arjun, Priya, Siddharth | UPCOMING |
| 12:00 | 60 min | Lunch Break | — | UPCOMING |
| 13:00 | 90 min | Workshop: Building with LLMs | Kiran Desai | UPCOMING |
| 14:30 | 60 min | Talk: Open Source Careers | Meera Joshi | UPCOMING |
| 15:30 | 30 min | Hackathon Results & Awards | Jury Panel | UPCOMING |
| 16:00 | 30 min | Closing Ceremony | Dr. S. Patel | UPCOMING |

> **IMPORTANT:** Seed Dr. Rohan Verma's keynote with status `DELAYED` so the demo can show recovery immediately on first load.

### `apps/api/src/seed/reset.ts`

```typescript
// Drop all data and re-seed — used by demo reset button
import { PrismaClient } from '@prisma/client';
import { runSeed } from './seed';

const prisma = new PrismaClient();

async function reset() {
  await prisma.agendaItem.deleteMany();
  await prisma.speaker.deleteMany();
  await prisma.event.deleteMany();
  await runSeed();
  console.log('Database reset and re-seeded');
  await prisma.$disconnect();
}

reset().catch(console.error);
```

### Add to root `package.json` scripts:

```json
"db:seed": "pnpm --filter @smart-anchor/api tsx src/seed/seed.ts",
"db:reset": "pnpm --filter @smart-anchor/api tsx src/seed/reset.ts"
```

---

## Step 6 — Reset API Endpoint

In `apps/api/src/modules/recovery/` add a controller + service:

```
POST /api/reset   → runs reset.ts logic, returns { success: true, message: 'Database reset' }
```

This endpoint is consumed by the Demo Mode reset button on the frontend.

---

## Step 7 — Register All Modules in AppModule

Edit `apps/api/src/app.module.ts` to import `EventsModule`, `AgendaModule`, `SpeakersModule`.

---

## Acceptance Criteria (Teammate 1)

- [ ] `GET /events` returns array with nested agendaItems and speakers
- [ ] `GET /agenda/event/:eventId` returns items ordered by scheduledStart
- [ ] `PATCH /agenda/:id/delay` with `{ delayMinutes: 15 }` returns `{ diff[], itemsAffected }` and updates DB
- [ ] Cascade delay shifts ALL downstream items in same event
- [ ] Overlap after cascade returns 409 with readable message + diff array
- [ ] Midnight-crossing delay returns 400 with readable message
- [ ] `pnpm db:seed` populates 10 speakers + 9 agenda items for TechFest 2025
- [ ] `POST /api/reset` drops and re-seeds in under 3 seconds
- [ ] `GET /health` still returns 200

---

---

# TEAMMATE 2 — AI + WebSocket

**Branch:** `feature/backend-ai-ws`
**Depends on:** Teammate 1's branch merged to `develop` first (needs AgendaService)
**Merges into:** `develop` via PR
**Scope:** Live WebSocket gateway (real broadcasts) · AI script generation (real OpenAI) · Fallback scripts · Prompt templates

---

## Step 0 — Branch Setup

```bash
git fetch origin
git checkout develop
git pull origin develop
git checkout -b feature/backend-ai-ws
```

---

## Step 1 — AI Fallback Scripts

### `apps/api/src/modules/ai/fallback-scripts.ts`

```typescript
export const FALLBACK_SCRIPTS: Record<string, string> = {
  OPENING:
    "Good morning, everyone! Welcome to TechFest 2025. We are thrilled to have you here today for what promises to be an incredible day of learning, innovation, and inspiration. Let's get started!",
  INTRODUCTION:
    "Please join me in welcoming our next speaker to the stage. Their work has been an inspiration to many in our community, and we are truly honored to have them with us today.",
  TRANSITION:
    "Thank you for that wonderful session. Let's take a brief moment before we welcome our next speaker. Please help yourselves to some refreshments while we prepare.",
  CLOSING:
    "And that brings us to the end of TechFest 2025. Thank you to all our incredible speakers, our sponsors, the organizing committee, and most importantly — all of you. Have a safe journey home!",
  ANNOUNCEMENT:
    "Attention, everyone. We have a brief schedule adjustment. We appreciate your patience and will resume shortly. Please feel free to network and enjoy the refreshments.",
};
```

---

## Step 2 — Prompt Templates

### `apps/api/src/modules/ai/prompts/opening.prompt.ts`

```typescript
export function buildOpeningPrompt(eventName: string, venue: string): string {
  return `You are a professional event anchor. Write a warm, energetic opening script for a tech conference.
Event: ${eventName}
Venue: ${venue}
Requirements: 3-4 sentences. Welcoming tone. Mention excitement for the day ahead. End with a call to attention.
Return ONLY the script text, no quotes, no stage directions.`;
}
```

### `apps/api/src/modules/ai/prompts/introduction.prompt.ts`

```typescript
export function buildIntroductionPrompt(speaker: {
  name: string;
  topic: string;
  organization: string;
  bio: string;
}): string {
  const bio = speaker.bio?.trim() || `a distinguished professional from ${speaker.organization}`;
  const topic = speaker.topic?.trim() || 'an exciting topic';
  return `You are a professional event anchor. Write a 2-3 sentence speaker introduction.
Speaker: ${speaker.name}
Organization: ${speaker.organization}
Topic: ${topic}
Bio: ${bio}
Requirements: Enthusiastic but professional. Highlight expertise. End with "Please welcome ${speaker.name}!".
Return ONLY the script text.`;
}
```

### `apps/api/src/modules/ai/prompts/transition.prompt.ts`

```typescript
export function buildTransitionPrompt(from: string, to: string, delayMinutes?: number): string {
  const delayNote = delayMinutes
    ? `Note: there is a ${delayMinutes}-minute delay. Acknowledge it gracefully without alarming the audience.`
    : '';
  return `You are a professional event anchor. Write a smooth transition script between sessions.
Previous session: ${from}
Next session: ${to}
${delayNote}
Requirements: 2-3 sentences. Keep energy positive. Bridge the two topics naturally.
Return ONLY the script text.`;
}
```

---

## Step 3 — AI Service (real OpenAI + 5s timeout + fallback)

### `apps/api/src/modules/ai/ai.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { FALLBACK_SCRIPTS } from './fallback-scripts';
import { buildOpeningPrompt } from './prompts/opening.prompt';
import { buildIntroductionPrompt } from './prompts/introduction.prompt';
import { buildTransitionPrompt } from './prompts/transition.prompt';

const TIMEOUT_MS = 5000;

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  async generateScript(params: {
    type: 'OPENING' | 'INTRODUCTION' | 'TRANSITION' | 'CLOSING' | 'ANNOUNCEMENT';
    context: Record<string, unknown>;
  }): Promise<{ content: string; fromCache: boolean }> {
    const prompt = this.buildPrompt(params.type, params.context);

    try {
      const content = await Promise.race([
        this.callOpenAI(prompt),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('OpenAI timeout')), TIMEOUT_MS),
        ),
      ]);
      return { content, fromCache: false };
    } catch (err) {
      this.logger.warn(`OpenAI call failed (${err.message}), using fallback`);
      return {
        content: FALLBACK_SCRIPTS[params.type] ?? FALLBACK_SCRIPTS.ANNOUNCEMENT,
        fromCache: true,
      };
    }
  }

  private async callOpenAI(prompt: string): Promise<string> {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 300,
      temperature: 0.7,
    });
    return response.choices[0].message.content ?? '';
  }

  private buildPrompt(type: string, context: Record<string, unknown>): string {
    switch (type) {
      case 'OPENING':
        return buildOpeningPrompt(
          context.eventName as string,
          (context.venue as string) ?? 'the main auditorium',
        );
      case 'INTRODUCTION':
        return buildIntroductionPrompt(context as any);
      case 'TRANSITION':
        return buildTransitionPrompt(
          context.from as string,
          context.to as string,
          context.delayMinutes as number,
        );
      case 'CLOSING':
        return `Write a warm closing script for ${context.eventName}. Thank speakers, sponsors, audience. 3-4 sentences. Return ONLY the script.`;
      case 'ANNOUNCEMENT':
        return `Write a calm audience announcement: "${context.message}". 1-2 sentences, reassuring tone. Return ONLY the script.`;
      default:
        return `Write a professional MC script for: ${JSON.stringify(context)}`;
    }
  }
}
```

### `apps/api/src/modules/ai/ai.controller.ts`

```typescript
import { Controller, Post, Body } from '@nestjs/common';
import { AiService } from './ai.service';

class GenerateScriptDto {
  type: 'OPENING' | 'INTRODUCTION' | 'TRANSITION' | 'CLOSING' | 'ANNOUNCEMENT';
  context: Record<string, unknown>;
}

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('generate-script')
  generate(@Body() dto: GenerateScriptDto) {
    return this.aiService.generateScript(dto);
  }
}
```

---

## Step 4 — Live WebSocket Gateway (real broadcasts)

### `apps/api/src/modules/live/live.gateway.ts`

Replace ping/pong stub:

```typescript
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/live' })
export class LiveGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(LiveGateway.name);
  private latestState: unknown = null; // for reconnect-safe sync

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    if (this.latestState) {
      client.emit('state:sync', this.latestState); // immediately sync new clients
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  broadcastAgendaUpdate(payload: { agendaItems: unknown[]; diff?: unknown[] }) {
    this.latestState = { ...((this.latestState as any) ?? {}), agendaItems: payload.agendaItems };
    this.server.emit('agenda:update', payload);
  }

  broadcastScriptGenerated(payload: { scriptId: string; type: string; content: string; fromCache: boolean }) {
    this.server.emit('script:generated', payload);
  }

  broadcastAnnouncement(payload: { message: string; severity: 'info' | 'warn' | 'critical' }) {
    this.server.emit('announce:new', payload);
  }

  broadcastFullState(state: unknown) {
    this.latestState = state;
    this.server.emit('state:sync', state);
  }

  @SubscribeMessage('ping')
  handlePing(client: Socket) {
    client.emit('pong', { timestamp: new Date().toISOString() });
  }
}
```

### `apps/api/src/modules/live/live.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { LiveGateway } from './live.gateway';

@Module({
  providers: [LiveGateway],
  exports: [LiveGateway],
})
export class LiveModule {}
```

> **Coordination note:** After Teammate 1's branch is merged into `develop`, import `LiveModule` into `AgendaModule` and inject `LiveGateway` into `AgendaService`. Call `liveGateway.broadcastAgendaUpdate(...)` at the end of every `cascadeDelay()` call. Coordinate via PR comment or team chat.

---

## Acceptance Criteria (Teammate 2)

- [ ] `POST /ai/generate-script` with INTRODUCTION context returns `{ content, fromCache }`
- [ ] With no OpenAI key or network down, returns fallback within 5.1s (no crash)
- [ ] Empty `bio` field uses graceful neutral template, not an empty string to the LLM
- [ ] WebSocket `/live` namespace: new client immediately receives `state:sync` if state exists
- [ ] `broadcastAgendaUpdate()` emits `agenda:update` to all connected clients
- [ ] `broadcastAnnouncement()` emits `announce:new` correctly

---

---

# TEAMMATE 3 — Frontend Dashboard

**Branch:** `feature/frontend-dashboard`
**Depends on:** Teammate 4's design system merged to `develop` first (CSS tokens must exist)
**Merges into:** `develop` via PR
**Scope:** Live organizer dashboard · Script panel · WebSocket client hook · Zustand store · Organizer pages · Demo toolbar

---

## Step 0 — Branch Setup

```bash
git fetch origin
git checkout develop
git pull origin develop
git checkout -b feature/frontend-dashboard
```

---

## Step 1 — Install Dependencies

```bash
cd apps/web
pnpm add zustand socket.io-client
```

---

## Step 2 — Zustand Store

### `apps/web/store/liveSyncStore.ts`

```typescript
import { create } from 'zustand';

interface Toast {
  id: string;
  message: string;
  severity: 'info' | 'warn' | 'critical';
}

interface ScriptModal {
  open: boolean;
  content?: string;
  type?: string;
  fromCache?: boolean;
}

interface LiveSyncState {
  agendaItems: unknown[];
  connectionStatus: 'live' | 'connecting' | 'reconnecting' | 'disconnected';
  scriptModal: ScriptModal;
  toasts: Toast[];
  setAgendaItems: (items: unknown[]) => void;
  setConnectionStatus: (status: LiveSyncState['connectionStatus']) => void;
  setScriptModal: (modal: ScriptModal) => void;
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

export const useLiveSyncStore = create<LiveSyncState>((set) => ({
  agendaItems: [],
  connectionStatus: 'connecting',
  scriptModal: { open: false },
  toasts: [],
  setAgendaItems: (items) => set({ agendaItems: items }),
  setConnectionStatus: (status) => set({ connectionStatus: status }),
  setScriptModal: (modal) => set({ scriptModal: modal }),
  addToast: (toast) =>
    set((s) => ({ toasts: [...s.toasts, { ...toast, id: crypto.randomUUID() }] })),
  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
```

---

## Step 3 — WebSocket Hook

### `apps/web/hooks/useLiveSync.ts`

```typescript
'use client';
import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useLiveSyncStore } from '@/store/liveSyncStore';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:4000';
const MAX_RETRY_DELAY_MS = 30000;

export function useLiveSync() {
  const socketRef = useRef<Socket | null>(null);
  const retryDelayRef = useRef(1000);
  const { setAgendaItems, setConnectionStatus, setScriptModal, addToast } = useLiveSyncStore();

  const connect = useCallback(() => {
    setConnectionStatus('connecting');
    const socket = io(`${WS_URL}/live`, { transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnectionStatus('live');
      retryDelayRef.current = 1000;
    });

    socket.on('disconnect', () => {
      setConnectionStatus('reconnecting');
      setTimeout(() => {
        retryDelayRef.current = Math.min(retryDelayRef.current * 2, MAX_RETRY_DELAY_MS);
        connect();
      }, retryDelayRef.current);
    });

    socket.on('state:sync', (state) => {
      if (state?.agendaItems) setAgendaItems(state.agendaItems);
    });

    socket.on('agenda:update', (payload) => {
      setAgendaItems(payload.agendaItems);
    });

    socket.on('script:generated', (payload) => {
      setScriptModal({ open: true, ...payload });
    });

    socket.on('announce:new', (payload) => {
      addToast(payload);
    });
  }, [setAgendaItems, setConnectionStatus, setScriptModal, addToast]);

  useEffect(() => {
    connect();
    return () => { socketRef.current?.disconnect(); };
  }, [connect]);
}
```

---

## Step 4 — Components to Build

Build each component as `ComponentName/ComponentName.tsx` + `ComponentName/ComponentName.module.css`. Use CSS Modules — no inline styles.

### `AgendaTimeline`

- Vertical list of agenda items ordered by `scheduledStart`
- Status badge per item: LIVE (green), DELAYED (amber), COMPLETED (muted), UPCOMING (indigo)
- Current LIVE item has pulsing left border (use `pulse-live` keyframe from design system)
- On store update, items re-render with `transition: transform var(--transition-agenda)` for smooth reflow
- Time formatted as `HH:MM`

### `CurrentSpeakerCard`

- Shows the currently LIVE or first DELAYED agenda item
- Ambient green glow: `box-shadow: var(--shadow-live)`
- Countdown timer showing time remaining (minutes:seconds), updates every second via `setInterval`
- Speaker name in large bold, topic in muted text below
- Uses `--font-mono` for the timer

### `NextUpCard`

- Shows next UPCOMING item
- Countdown: "in X min"
- Indigo accent left border

### `ScriptModal`

- Full-screen overlay with `backdrop-filter: blur(12px)`
- While loading: show `.shimmer` skeleton blocks (3 lines, varying widths)
- On load: script text in `.script-block` class (from design system), large monospace teleprompter view
- If `fromCache === true`: show amber badge "⚡ Using cached template"
- Buttons:
  - **Copy** → `navigator.clipboard.writeText(content)`
  - **Read Aloud** → `window.speechSynthesis.speak(new SpeechSynthesisUtterance(content))`
  - **Mark as Used** → closes modal

### `DelayModal`

- Number input (1–120 minutes), submit button
- On submit: `PATCH /agenda/:id/delay` with `{ delayMinutes }`
- Show loading state during request
- On success: show diff list animated with stagger fade (each item: `oldTime → newTime`)

### `AnnouncementToast`

- Fixed to top of screen, `z-index: 9999`
- Slides in with `slide-down` animation
- Color coded: `info` = indigo border, `warn` = amber border, `critical` = red border
- Auto-dismiss after 6 seconds
- Manual close (X) button

### `LiveStatusPill`

- Reads `connectionStatus` from Zustand store
- `● LIVE` in green when status is `live`
- `◌ RECONNECTING...` in amber with spin animation when status is `reconnecting` or `connecting`

---

## Step 5 — Dashboard Page

### `apps/web/app/(dashboard)/events/[id]/live/page.tsx`

```
Header: [STAGE-SYNC] ——— [Event Name] ——— [LiveStatusPill] [HH:MM:SS clock]

Body (two columns):
Left  (280px): AgendaTimeline (scrollable)
Right (flex 1):
  - "NOW ON STAGE" label + CurrentSpeakerCard
  - "UP NEXT" label + NextUpCard
  - Action buttons row:
      [Generate Script ▶]  [Mark Delayed]  [Announce]
```

- Call `useLiveSync()` at page level
- On mount: `GET /events/:id` to load initial data, populate store
- "Generate Script" → POST `/ai/generate-script` with current speaker context → show ScriptModal (shimmer while pending)
- "Mark Delayed" → open DelayModal
- "Announce" → inline text input → POST to broadcast endpoint → shows AnnouncementToast

---

## Step 6 — Organizer Management Pages

| Route | What to build |
|---|---|
| `/events` | Card grid of all events. Click to enter. |
| `/events/[id]/setup` | Edit event name, manage speakers list, manage agenda items |
| `/events/[id]/live` | Main dashboard (built above) |
| `/events/[id]/scripts` | Scrollable history of generated scripts |

Keep `/setup` and `/scripts` functional but simple — judges focus on `/live`.

---

## Step 7 — Demo Toolbar (dev-only)

### `apps/web/components/DemoToolbar/DemoToolbar.tsx`

Fixed footer, only renders when `process.env.NODE_ENV !== 'production'`:

- **[Reset DB]** → `POST /api/reset` → reload page
- **[Demo Mode]** → toggles a timer that auto-advances clock and simulates state changes every 30 seconds

---

## Acceptance Criteria (Teammate 3)

- [ ] `/events/[id]/live` loads with real data from API
- [ ] AgendaTimeline shows all items with correct color-coded status badges
- [ ] CurrentSpeakerCard shows pulsing live glow
- [ ] "Mark Delayed" → agenda reflows with CSS transition animation
- [ ] "Generate Script" → shimmer skeleton shows → script appears in modal
- [ ] If AI takes >5s, `⚡ Using cached template` amber badge appears
- [ ] LiveStatusPill correctly shows LIVE / RECONNECTING states
- [ ] AnnouncementToast slides in from top on `announce:new` WS event
- [ ] "Read Aloud" button speaks the script text
- [ ] Reset button calls `/api/reset` and refreshes dashboard
- [ ] No layout breaks on screens narrower than 768px

---

---

# TEAMMATE 4 — Frontend UI System + Polish

**Branch:** `feature/frontend-ui-system`
**Must be merged to `develop` FIRST — all other frontend work depends on this**
**Merges into:** `develop` via PR
**Scope:** Global CSS design system · Tokens · Base component classes · All keyframe animations · Landing page · Mobile responsiveness

---

## Step 0 — Branch Setup

```bash
git fetch origin
git checkout develop
git pull origin develop
git checkout -b feature/frontend-ui-system
```

---

## Step 1 — Design Tokens

### `apps/web/styles/tokens.css`

```css
:root {
  /* Colors */
  --color-bg:           #0a0b0f;
  --color-surface:      #13151c;
  --color-surface-2:    #1c1f2b;
  --color-border:       #2a2d3a;
  --color-border-focus: #6366f1;

  --color-accent:       #6366f1;
  --color-accent-dim:   #4f46e5;
  --color-accent-glow:  rgba(99, 102, 241, 0.18);

  --color-live:         #22c55e;
  --color-live-glow:    rgba(34, 197, 94, 0.2);

  --color-warn:         #f59e0b;
  --color-warn-glow:    rgba(245, 158, 11, 0.18);

  --color-danger:       #ef4444;
  --color-danger-glow:  rgba(239, 68, 68, 0.18);

  --color-muted:        #475569;
  --color-text:         #f1f5f9;
  --color-text-muted:   #94a3b8;
  --color-text-dim:     #64748b;

  /* Typography */
  --font-display: 'Inter', sans-serif;
  --font-mono:    'JetBrains Mono', monospace;

  --text-xs:   0.75rem;
  --text-sm:   0.875rem;
  --text-base: 1rem;
  --text-lg:   1.125rem;
  --text-xl:   1.25rem;
  --text-2xl:  1.5rem;
  --text-3xl:  1.875rem;

  --fw-normal:   400;
  --fw-medium:   500;
  --fw-semibold: 600;
  --fw-bold:     700;

  /* Spacing */
  --space-1:  0.25rem;
  --space-2:  0.5rem;
  --space-3:  0.75rem;
  --space-4:  1rem;
  --space-5:  1.25rem;
  --space-6:  1.5rem;
  --space-8:  2rem;
  --space-10: 2.5rem;
  --space-12: 3rem;
  --space-16: 4rem;

  /* Radii */
  --radius-sm:   6px;
  --radius-md:   10px;
  --radius-lg:   16px;
  --radius-xl:   24px;
  --radius-full: 9999px;

  /* Shadows */
  --shadow-sm:     0 1px 3px rgba(0,0,0,0.4);
  --shadow-md:     0 4px 16px rgba(0,0,0,0.5);
  --shadow-lg:     0 8px 32px rgba(0,0,0,0.6);
  --shadow-accent: 0 0 24px var(--color-accent-glow);
  --shadow-live:   0 0 32px var(--color-live-glow);

  /* Transitions */
  --transition-fast:   150ms ease;
  --transition-base:   250ms ease;
  --transition-slow:   400ms ease;
  --transition-agenda: 300ms cubic-bezier(0.4, 0, 0.2, 1);
}
```

---

## Step 2 — Animations

### `apps/web/styles/animations.css`

```css
/* Ambient live glow — CurrentSpeakerCard */
@keyframes pulse-live {
  0%, 100% { box-shadow: 0 0 0 0 var(--color-live-glow), var(--shadow-md); }
  50%       { box-shadow: 0 0 0 12px transparent, var(--shadow-md); }
}

/* Shimmer skeleton — AI script loading */
@keyframes shimmer {
  0%   { background-position: -1000px 0; }
  100% { background-position:  1000px 0; }
}

/* Toast slide-in from top */
@keyframes slide-down {
  from { transform: translateY(-100%); opacity: 0; }
  to   { transform: translateY(0);     opacity: 1; }
}

/* Toast auto-dismiss */
@keyframes slide-up {
  from { transform: translateY(0);     opacity: 1; }
  to   { transform: translateY(-100%); opacity: 0; }
}

/* Script text word fade-in (stagger via JS inline delay) */
@keyframes word-fade {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Reconnect spinning indicator */
@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Card entrance animation */
@keyframes fade-up {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Agenda item reflow — applied via CSS class */
.agenda-item {
  transition: transform var(--transition-agenda), opacity var(--transition-base);
}

/* Shimmer utility */
.shimmer {
  background: linear-gradient(
    90deg,
    var(--color-surface)   0px,
    var(--color-surface-2) 40px,
    var(--color-surface)   80px
  );
  background-size: 1000px 100%;
  animation: shimmer 1.4s infinite linear;
  border-radius: var(--radius-sm);
}
```

---

## Step 3 — Base Component Classes

### `apps/web/styles/components.css`

```css
/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-5);
  border-radius: var(--radius-md);
  font-family: var(--font-display);
  font-size: var(--text-sm);
  font-weight: var(--fw-semibold);
  cursor: pointer;
  border: 1px solid transparent;
  transition: all var(--transition-base);
  outline: none;
  white-space: nowrap;
}
.btn:hover  { transform: scale(1.02); }
.btn:active { transform: scale(0.98); }
.btn-primary { background: var(--color-accent); color: #fff; box-shadow: var(--shadow-accent); }
.btn-primary:hover { background: var(--color-accent-dim); }
.btn-ghost   { background: transparent; color: var(--color-text-muted); border-color: var(--color-border); }
.btn-ghost:hover { background: var(--color-surface-2); color: var(--color-text); }
.btn-danger  { background: var(--color-danger); color: #fff; }
.btn-warn    { background: var(--color-warn);   color: #000; }
.btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }

/* Cards */
.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  box-shadow: var(--shadow-sm);
}
.card-elevated {
  background: var(--color-surface-2);
  box-shadow: var(--shadow-md);
}

/* Status badges */
.badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--fw-semibold);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.badge-live     { background: var(--color-live-glow);   color: var(--color-live);   }
.badge-delayed  { background: var(--color-warn-glow);   color: var(--color-warn);   }
.badge-upcoming { background: var(--color-accent-glow); color: var(--color-accent); }
.badge-done     { background: rgba(71,85,105,0.2);      color: var(--color-muted);  }

/* Modal overlay */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(12px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fade-up 200ms ease;
}
.modal-content {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: var(--space-8);
  width: min(640px, 92vw);
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: var(--shadow-lg);
}

/* Input */
.input {
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text);
  font-family: var(--font-display);
  font-size: var(--text-sm);
  padding: var(--space-3) var(--space-4);
  width: 100%;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
  outline: none;
}
.input:focus {
  border-color: var(--color-border-focus);
  box-shadow: 0 0 0 3px var(--color-accent-glow);
}

/* Divider */
.divider { height: 1px; background: var(--color-border); margin: var(--space-4) 0; }

/* Teleprompter script block */
.script-block {
  font-family: var(--font-mono);
  font-size: var(--text-lg);
  line-height: 1.9;
  color: var(--color-text);
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-8);
  white-space: pre-wrap;
}
```

---

## Step 4 — Global CSS (import everything)

### `apps/web/app/globals.css`

Replace entire file:

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
@import '../styles/tokens.css';
@import '../styles/animations.css';
@import '../styles/components.css';

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html { scroll-behavior: smooth; }

body {
  background: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-display);
  font-size: var(--text-base);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  min-height: 100vh;
}

::selection { background: var(--color-accent-glow); color: var(--color-text); }

::-webkit-scrollbar       { width: 6px; }
::-webkit-scrollbar-track { background: var(--color-bg); }
::-webkit-scrollbar-thumb { background: var(--color-border); border-radius: var(--radius-full); }
::-webkit-scrollbar-thumb:hover { background: var(--color-accent); }

a { color: var(--color-accent); text-decoration: none; }
a:hover { text-decoration: underline; }

h1, h2, h3, h4 { font-weight: var(--fw-bold); line-height: 1.25; }
```

---

## Step 5 — Layout & Header Components

### `apps/web/components/Header/Header.tsx`

Sticky top navigation bar for all dashboard pages:

```
[ STAGE·SYNC ] ———————————————— [ Event Name ] ———————————————— [ ● LIVE ] [ 14:32:07 ]
```

- Logo: `STAGE` in `--color-text`, `·SYNC` in `--color-accent`
- Background: `rgba(10,11,15,0.85)` with `backdrop-filter: blur(16px)` — frosted glass effect
- Clock: live updating every second via `useEffect` + `setInterval`, `--font-mono`
- Sticky, `z-index: 100`, `border-bottom: 1px solid var(--color-border)`

### `apps/web/components/Layout/DashboardLayout.tsx`

Two-column layout wrapper:

```
[Left sidebar 280px fixed] | [Main area flex: 1, padding, scrollable]
```

---

## Step 6 — Mobile Responsive Breakpoints

Add at the bottom of `globals.css` or in a `responsive.css` file imported from globals:

```css
@media (max-width: 768px) {
  /* Dashboard: single column, sidebar becomes collapsible bottom drawer */
  .dashboard-layout { flex-direction: column; }
  .sidebar { display: none; } /* show via toggle button */

  /* Modals: full-screen bottom sheet */
  .modal-content {
    width: 100vw;
    max-height: 90vh;
    border-radius: var(--radius-xl) var(--radius-xl) 0 0;
    position: fixed;
    bottom: 0;
    left: 0;
  }

  /* Typography scale down */
  :root {
    --text-base: 0.9rem;
    --text-lg:   1rem;
    --text-3xl:  1.5rem;
  }
}
```

---

## Step 7 — Landing Page

### `apps/web/app/page.tsx`

Replace the bare scaffold. Build a premium landing page:

- **Hero section:**
  - Large headline: "Real-time Stage Management for Live Events"
  - Subline: "AI-generated scripts. Instant delay recovery. Live sync across devices."
  - CTA button → `/events` (uses `.btn.btn-primary`, large size)
- **Animated background:** CSS gradient mesh using `@keyframes` — slow-moving indigo/purple blobs (pure CSS, no images needed)
- **Feature cards row (3 cards):**
  - "AI Scripts" — generate transition scripts in seconds
  - "Delay Recovery" — cascade delays, keep the show running
  - "Live Sync" — all devices update instantly

---

## Acceptance Criteria (Teammate 4)

- [ ] `globals.css` imports Inter + JetBrains Mono from Google Fonts
- [ ] All tokens in `tokens.css` usable via `var(--token-name)` in any component
- [ ] `.shimmer` class animates correctly as a skeleton loader
- [ ] `pulse-live` animation visible on any element assigned it
- [ ] `slide-down` / `slide-up` toast animations smooth at 60fps
- [ ] All base classes defined: `.btn`, `.btn-primary`, `.btn-ghost`, `.btn-danger`, `.card`, `.card-elevated`, `.badge-*`, `.modal-overlay`, `.modal-content`, `.input`, `.script-block`
- [ ] Header: sticky, frosted glass background, live clock
- [ ] Dashboard layout: two-column ≥768px, single-column <768px
- [ ] Landing page is visually premium — animated background, readable hero, feature cards
- [ ] All buttons have `:hover` (scale 1.02) and `:active` (scale 0.98) states

---

---

## Integration Order (Critical Path)

```
Teammate 4 (UI System)     → merge to develop FIRST
         ↓
Teammate 1 (Backend Core)  → merge to develop SECOND
         ↓
Teammate 2 (AI + WS)       → merge to develop THIRD
         ↓
Teammate 3 (Dashboard)     → merge to develop LAST
```

## PR Checklist (Every PR Before Merging)

- [ ] Branch is up to date: `git pull origin develop` + conflicts resolved
- [ ] `pnpm dev` starts without errors
- [ ] No TypeScript errors: `pnpm typecheck`
- [ ] No unhandled console errors on page load
- [ ] All acceptance criteria for your section are checked
- [ ] PR title format: `feat(scope): short description`

## Edge Cases — Every Teammate Must Handle

| Case | Required Behavior |
|---|---|
| API unavailable | Show error state — never blank screen or crash |
| No data yet | Show empty states with helpful messages, not null renders |
| Loading states | Every async action shows a loading indicator or shimmer |
| Form submission errors | Inline error messages — no silent failures |
| Long text / long names | Ellipsis truncation — no layout overflow |

---

*Maintained in `docs/TASK_SPLIT.md` on `main` branch. Last updated: 2026-09-19.*
