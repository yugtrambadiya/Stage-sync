# Architecture

```text
                    ┌──────────────────────┐
                    │      Next.js Web     │
                    │ Organizer / Anchor / │
                    │ Audience dashboards  │
                    └──────────┬───────────┘
                               │ REST + WS
                               ▼
                    ┌──────────────────────┐
                    │      NestJS API      │
                    │ Auth / Events / Live  │
                    │ Agenda / AI / WS     │
                    └─────┬────────┬───────┘
                          │        │
                    Prisma│        │Redis
                          ▼        ▼
                 ┌────────────┐ ┌─────────┐
                 │ PostgreSQL │ │  Redis  │
                 │ + pgvector │ │ Pub/Sub │
                 └────────────┘ └─────────┘
                          │
                          ▼
                    ┌────────────┐
                    │ AI Engine  │
                    │ RAG + LLM  │
                    └────────────┘
```

## Design rule

The deterministic scheduling engine owns time, duration, dependencies and conflicts.

AI owns language, contextual suggestions, explanations and script generation.

AI never silently changes the official agenda. Organizer approval is required.
