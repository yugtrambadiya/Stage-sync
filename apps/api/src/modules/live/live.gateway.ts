import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";

@WebSocketGateway({
  cors: { origin: "*" },
})
export class LiveGateway {
  @WebSocketServer()
  server: any;

  @SubscribeMessage("ping")
  handlePing(@MessageBody() body: unknown) {
    return {
      event: "pong",
      data: body,
    };
  }

  @SubscribeMessage("stage:broadcast-announcement")
  handleAnnouncement(@MessageBody() data: { eventId: string; message: string; priority?: string }) {
    if (this.server) {
      this.server.emit(`event:${data.eventId}:announcement`, data);
    }
    return { status: "broadcasted", data };
  }

  @SubscribeMessage("stage:update-activity")
  handleStageUpdate(@MessageBody() data: { eventId: string; currentItemId: string; status: string }) {
    if (this.server) {
      this.server.emit(`event:${data.eventId}:stage-update`, data);
    }
    return { status: "updated", data };
  }
}
