import { Body, Controller, Get, Post } from "@nestjs/common";
import { EventsService } from "./events.service";

@Controller("events")
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  list() {
    return this.eventsService.list();
  }

  @Post()
  create(@Body() body: { name: string }) {
    return this.eventsService.create(body.name);
  }
}
