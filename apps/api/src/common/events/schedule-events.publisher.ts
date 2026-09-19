import { Injectable, Logger } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';
import { ScheduleDomainEvent } from '@smart-anchor/shared';

/**
 * In-process event publisher for domain events.
 *
 * Teammate 2 (AI + WebSocket): inject this service and subscribe to events$
 * to broadcast via Socket.io. This publisher has ZERO socket.io or
 * @nestjs/websockets imports — it is a pure in-process RxJS Subject.
 *
 * Usage:
 *   constructor(private publisher: ScheduleEventsPublisher) {}
 *   this.publisher.events$.subscribe(evt => gateway.broadcast(evt));
 *
 * Event types: schedule.cascaded | schedule.reverted | agenda.created |
 *              agenda.updated | agenda.deleted | demo.reset
 */
@Injectable()
export class ScheduleEventsPublisher {
  private readonly logger = new Logger(ScheduleEventsPublisher.name);
  private readonly subject = new Subject<ScheduleDomainEvent>();

  /** Observable — Teammate 2 subscribes here */
  readonly events$: Observable<ScheduleDomainEvent> = this.subject.asObservable();

  publish(event: ScheduleDomainEvent): void {
    this.logger.debug(`Publishing domain event: ${event.type} for eventId=${event.eventId}`);
    this.subject.next(event);
  }
}
