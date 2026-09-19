import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import { EventsService } from "./events.service";

@Controller("events")
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  list() {
    return this.eventsService.list();
  }

  @Post("seed")
  seed() {
    return this.eventsService.seedDemoEvent();
  }

  @Get(":id")
  getById(@Param("id") id: string) {
    return this.eventsService.getById(id);
  }

  @Post()
  create(
    @Body()
    body: {
      name: string;
      description?: string;
      venue?: string;
      date?: string;
      timezone?: string;
    },
  ) {
    return this.eventsService.create(body);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() body: any) {
    return this.eventsService.update(id, body);
  }

  @Delete(":id")
  delete(@Param("id") id: string) {
    return this.eventsService.delete(id);
  }

  // --- Agenda Endpoints ---
  @Post(":id/agenda")
  addAgendaItem(
    @Param("id") eventId: string,
    @Body()
    body: {
      title: string;
      description?: string;
      startTime: string;
      durationMinutes: number;
      speakerId?: string;
    },
  ) {
    return this.eventsService.addAgendaItem(eventId, body);
  }

  @Patch(":id/agenda/:itemId")
  updateAgendaItem(
    @Param("itemId") itemId: string,
    @Body() body: any,
  ) {
    return this.eventsService.updateAgendaItem(itemId, body);
  }

  @Delete(":id/agenda/:itemId")
  deleteAgendaItem(@Param("itemId") itemId: string) {
    return this.eventsService.deleteAgendaItem(itemId);
  }

  @Post(":id/agenda/delay")
  applyDelay(
    @Param("id") eventId: string,
    @Body() body: { itemId: string; delayMinutes: number },
  ) {
    return this.eventsService.applyDelay(eventId, body.itemId, Number(body.delayMinutes));
  }

  // --- Speaker Endpoints ---
  @Post(":id/speakers")
  addSpeaker(
    @Param("id") eventId: string,
    @Body()
    body: {
      name: string;
      designation?: string;
      organization?: string;
      biography?: string;
      expertise?: string[];
    },
  ) {
    return this.eventsService.addSpeaker(eventId, body);
  }

  @Patch(":id/speakers/:speakerId")
  updateSpeaker(
    @Param("speakerId") speakerId: string,
    @Body() body: any,
  ) {
    return this.eventsService.updateSpeaker(speakerId, body);
  }

  @Delete(":id/speakers/:speakerId")
  deleteSpeaker(@Param("speakerId") speakerId: string) {
    return this.eventsService.deleteSpeaker(speakerId);
  }

  // --- Script Endpoints ---
  @Post(":id/scripts")
  saveScript(
    @Param("id") eventId: string,
    @Body()
    body: {
      type: any;
      content: string;
      durationSec?: number;
      aiGenerated?: boolean;
    },
  ) {
    return this.eventsService.saveScript(eventId, body);
  }
}
