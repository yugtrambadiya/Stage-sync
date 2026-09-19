import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger, OnModuleInit, Optional } from '@nestjs/common';
import { ScheduleEventsPublisher } from '../../common/events/schedule-events.publisher';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/live' })
@Injectable()
export class LiveGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(LiveGateway.name);
  private latestState: unknown = null; // for reconnect-safe sync

  constructor(@Optional() private readonly publisher?: ScheduleEventsPublisher) {}

  onModuleInit() {
    if (this.publisher) {
      this.publisher.events$.subscribe((event) => {
        this.logger.log(`LiveGateway broadcasting domain event: ${event.type} for eventId=${event.eventId}`);
        if (this.server) {
          this.server.emit(event.type, event.data);
          this.server.emit('agenda:update', event.data);
        }
      });
    }
  }

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
    if (this.server) {
      this.server.emit('agenda:update', payload);
    }
  }

  broadcastScriptGenerated(payload: { scriptId: string; type: string; content: string; fromCache: boolean }) {
    if (this.server) {
      this.server.emit('script:generated', payload);
    }
  }

  broadcastAnnouncement(payload: { message: string; severity: 'info' | 'warn' | 'critical' }) {
    if (this.server) {
      this.server.emit('announce:new', payload);
    }
  }

  broadcastFullState(state: unknown) {
    this.latestState = state;
    if (this.server) {
      this.server.emit('state:sync', state);
    }
  }

  @SubscribeMessage('ping')
  handlePing(client: Socket) {
    client.emit('pong', { timestamp: new Date().toISOString() });
  }
}
