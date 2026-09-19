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
  @WebSocketServer() server!: Server;
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
