import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway
} from "@nestjs/websockets";

@WebSocketGateway({
  cors: { origin: "*" }
})
export class LiveGateway {
  @SubscribeMessage("ping")
  handlePing(@MessageBody() body: unknown) {
    return {
      event: "pong",
      data: body
    };
  }
}
