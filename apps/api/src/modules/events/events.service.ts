import { Injectable } from "@nestjs/common";

@Injectable()
export class EventsService {
  private events: { id: string; name: string }[] = [];

  list() {
    return this.events;
  }

  create(name: string) {
    const event = {
      id: crypto.randomUUID(),
      name
    };
    this.events.push(event);
    return event;
  }
}
