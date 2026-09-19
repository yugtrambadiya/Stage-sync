# StageSync API Contract · Backend Core

**Base URL**: `http://localhost:4000`  
**Interactive Swagger UI**: `http://localhost:4000/docs`  
**Specification Version**: 1.0 (Winning Edition)

---

## 1. Global Standards & Error Envelope

Every single error response across all endpoints conforms to this strict, predictable JSON shape:

```json
{
  "statusCode": 409,
  "error": "Conflict",
  "code": "SCHEDULE_OVERLAP",
  "message": "The requested delay would cause an agenda overlap between 'Morning Keynote' and 'WASM in Production'.",
  "path": "/agenda/agt_keynote/delay",
  "timestamp": "2025-09-19T04:30:00.000Z",
  "requestId": "f8a9e2d1-4c3b-4a5e-9f1a-8c7b6d5e4f3a",
  "conflicts": [
    {
      "a": { "id": "agt_keynote", "title": "Morning Keynote" },
      "b": { "id": "agt_wasm_talk", "title": "WASM in Production" },
      "overlapMinutes": 15
    }
  ]
}
```

### Standard Error Codes
| HTTP Status | Error Code | Meaning |
|---|---|---|
| 400 | `BAD_REQUEST` | Validation error (missing fields, wrong types) |
| 400 | `DELAY_CROSSES_MIDNIGHT` | Cascaded item would end after 23:59:59 in event timezone |
| 404 | `EVENT_NOT_FOUND` | Event with given ID not found |
| 404 | `SPEAKER_NOT_FOUND` | Speaker with given ID not found |
| 404 | `AGENDA_ITEM_NOT_FOUND` | Agenda item with given ID not found |
| 404 | `BATCH_NOT_FOUND` | Schedule change batch ID not found |
| 409 | `SCHEDULE_OVERLAP` | Cascade=false caused an overlap with a downstream session |
| 409 | `SPEAKER_REFERENCED` | Speaker cannot be deleted because they are assigned to agenda sessions |
| 409 | `EVENT_HAS_AGENDA` | Event cannot be deleted without `?cascade=true` |
| 409 | `STALE_UNDO` | Schedule has drifted since batch was applied; undo rejected |
| 409 | `BATCH_ALREADY_REVERTED` | Batch has already been undone |
| 409 | `CONCURRENT_MODIFICATION` | Concurrent edit detected; retry safely |
| 403 | `DEMO_RESET_DISABLED` | Demo reset endpoint called in production without `ALLOW_DEMO_RESET=true` |

---

## 2. Integration Guide for Teammate 2 (Real-Time & AI)

### How to Subscribe to Domain Events (Zero Polling)
Teammate 1 provides `ScheduleEventsPublisher` (NestJS event emitter backed by RxJS Observable).

In your `LiveGateway` or `AiService`, inject `ScheduleEventsPublisher`:

```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ScheduleEventsPublisher } from '../../common/events/schedule-events.publisher';

@Injectable()
export class LiveGateway implements OnModuleInit {
  constructor(private readonly publisher: ScheduleEventsPublisher) {}

  onModuleInit() {
    this.publisher.events$.subscribe((event) => {
      // Broadcast over WebSocket room
      this.server.to(`event:${event.eventId}`).emit(event.type, event.data);
    });
  }
}
```

### Published Domain Event Types
- `schedule.cascaded`: emitted on successful POST `/agenda/:id/delay`
  - Payload: `CascadeResult`
- `schedule.reverted`: emitted on successful POST `/schedule-changes/:batchId/undo`
  - Payload: `CascadeResult & { success: true, revertedCount: number }`
- `agenda.created` / `agenda.updated` / `agenda.deleted`: emitted on agenda CRUD mutations
- `demo.reset`: emitted when POST `/api/reset` completes
  - Payload: `{ message: "Demo data has been reset." }`

### Feeding AI Prompts with Deterministic Facts
Do NOT guess slack or session compression in your AI prompt. Consume the structured facts endpoint:
`GET /agenda/:id/recovery-options?delayMinutes=15`

Returns:
```json
{
  "agendaItemId": "agt_keynote",
  "delayMinutes": 15,
  "projectedEndTime": "2025-09-19T17:15:00.000Z",
  "totalSlackMinutes": 30,
  "slackGaps": [
    {
      "afterItemId": "agt_keynote",
      "afterTitle": "Opening Keynote",
      "beforeItemId": "agt_wasm_talk",
      "beforeTitle": "WebAssembly in Production",
      "gapMinutes": 15
    }
  ],
  "compressibleItems": [
    {
      "id": "agt_lunch",
      "title": "Lunch & Networking",
      "currentDurationMinutes": 60,
      "suggestedCompressMinutes": 15
    }
  ],
  "recommendation": "Existing buffer gaps of 30 min can absorb this 15 min delay with minimal impact."
}
```

---

## 3. Integration Guide for Teammate 3 (Frontend / Stage Manager UI)

### Core Endpoints & Payloads

#### 1. Preview Cascade Delay (Inline Diff Before Confirming)
`POST /agenda/:id/delay/preview`
- Request body:
```json
{
  "delayMinutes": 15,
  "cascade": true,
  "reason": "Flight delayed"
}
```
- Response (200 OK — Zero DB writes):
```json
{
  "agendaItemId": "agt_keynote",
  "eventId": "evt_technova_2025",
  "delayMinutes": 15,
  "cascade": true,
  "dryRun": true,
  "applied": false,
  "batchId": null,
  "changes": [
    {
      "itemId": "agt_keynote",
      "title": "Opening Keynote: The Future of Autonomous Systems",
      "oldStart": "2025-09-19T04:00:00.000Z",
      "newStart": "2025-09-19T04:15:00.000Z",
      "oldEnd": "2025-09-19T04:45:00.000Z",
      "newEnd": "2025-09-19T05:00:00.000Z"
    },
    {
      "itemId": "agt_wasm_talk",
      "title": "WebAssembly Beyond the Browser",
      "oldStart": "2025-09-19T04:45:00.000Z",
      "newStart": "2025-09-19T05:00:00.000Z",
      "oldEnd": "2025-09-19T05:30:00.000Z",
      "newEnd": "2025-09-19T05:45:00.000Z"
    }
  ],
  "impact": {
    "affectedCount": 8,
    "eventEndBefore": "2025-09-19T11:00:00.000Z",
    "eventEndAfter": "2025-09-19T11:15:00.000Z",
    "maxAllowedDelayMinutes": 450
  }
}
```

#### 2. Commit Cascade Delay (With Idempotency)
`POST /agenda/:id/delay`
- Headers:
  - `Idempotency-Key: <unique-uuid>`
- Request body:
```json
{
  "delayMinutes": 15,
  "cascade": true,
  "reason": "Flight delayed"
}
```
- Response: Same shape as preview with `"applied": true`, `"dryRun": false`, `"batchId": "..."`.
- If re-sent with the same `Idempotency-Key`, returns original response with header `Idempotent-Replay: true`.

#### 3. Undo Batch
`POST /schedule-changes/:batchId/undo`
- Reverts all item times back to their exact original slots atomically.
- Response (200 OK):
```json
{
  "success": true,
  "revertedCount": 8,
  "batchId": "batch_revert_uuid",
  "applied": true
}
```

#### 4. Consolidated Event State
`GET /events/:id/state?at=2025-09-19T04:30:00.000Z`
- Returns complete event, sorted agenda, recent schedule change history, and health summary:
```json
{
  "event": { "id": "evt_technova_2025", "name": "TechNova 2025" },
  "agenda": [ ... ],
  "recentChanges": [ ... ],
  "health": {
    "status": "DELAYED",
    "totalDelayMinutes": 15,
    "delayedSessions": 1,
    "projectedEndTime": "2025-09-19T11:15:00.000Z",
    "currentSession": { "id": "agt_keynote", "title": "Opening Keynote" },
    "nextSession": { "id": "agt_wasm_talk", "title": "WebAssembly Beyond the Browser" }
  }
}
```

#### 5. Demo Reset (One-Click Restore)
`POST /api/reset` or `POST /reset`
- Wipes demo mutations and restores 100% pristine TechNova 2025 seed in < 200ms.
- Response:
```json
{
  "success": true,
  "message": "Demo data reset successfully."
}
```

---

## 4. Full CRUD Endpoints Summary

### Events
- `GET /events`: list all events (supports `?q=`)
- `GET /events/:id`: single event with speakers and agenda
- `GET /events/:id/state`: consolidated state for UI
- `POST /events`: create event (supports optional `id` for fixtures)
- `PATCH /events/:id`: partial update
- `DELETE /events/:id`: delete event (blocked with 409 if agenda exists; pass `?cascade=true` to force)

### Speakers
- `GET /speakers`: list speakers (supports `?q=` and `?eventId=`)
- `GET /speakers/:id`: single speaker
- `POST /speakers`: create speaker
- `PATCH /speakers/:id`: partial update
- `DELETE /speakers/:id`: delete speaker (blocked with 409 if referenced by agenda items)

### Agenda Items
- `GET /agenda`: list agenda items (supports `?eventId=`)
- `GET /agenda/:id`: single agenda item with speaker details
- `POST /agenda`: create agenda item
- `PATCH /agenda/:id`: partial update
- `DELETE /agenda/:id`: delete agenda item
- `POST /agenda/:id/delay`: apply cascade delay
- `POST /agenda/:id/delay/preview`: preview cascade delay (dry run)
- `GET /agenda/:id/recovery-options`: deterministic AI prompt inputs

### Schedule Changes
- `GET /schedule-changes?eventId=:id`: change audit log (newest first)
- `POST /schedule-changes/:batchId/undo`: rollback change batch

### System / Health
- `GET /health`: `{ "status": "ok", "db": "up", "service": "stage-sync-api" }`
- `POST /api/reset` or `POST /reset`: reset demo state
