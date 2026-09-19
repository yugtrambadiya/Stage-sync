import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";
import { AgendaStatus, EventStatus, ScriptType } from "@smart-anchor/database";

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const events = await this.prisma.event.findMany({
      orderBy: { date: "asc" },
      include: {
        _count: {
          select: {
            agendaItems: true,
            speakers: true,
            scripts: true,
          },
        },
      },
    });

    if (events.length === 0) {
      await this.seedDemoEvent();
      return this.prisma.event.findMany({
        orderBy: { date: "asc" },
        include: {
          _count: {
            select: {
              agendaItems: true,
              speakers: true,
              scripts: true,
            },
          },
        },
      });
    }

    return events;
  }

  async getById(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        speakers: {
          orderBy: { createdAt: "asc" },
        },
        agendaItems: {
          orderBy: { startTime: "asc" },
          include: {
            speaker: true,
          },
        },
        scripts: {
          orderBy: { createdAt: "desc" },
        },
        changes: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    return event;
  }

  async create(data: {
    name: string;
    description?: string;
    venue?: string;
    date?: string;
    timezone?: string;
  }) {
    return this.prisma.event.create({
      data: {
        name: data.name,
        description: data.description ?? "College Tech Event",
        venue: data.venue ?? "Main Auditorium",
        date: data.date ? new Date(data.date) : new Date(),
        timezone: data.timezone ?? "Asia/Kolkata",
        status: EventStatus.READY,
      },
    });
  }

  async update(id: string, data: Partial<{
    name: string;
    description?: string;
    venue?: string;
    status: EventStatus;
  }>) {
    return this.prisma.event.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    return this.prisma.event.delete({
      where: { id },
    });
  }

  // --- Agenda Items Management ---
  async addAgendaItem(eventId: string, data: {
    title: string;
    description?: string;
    startTime: string;
    durationMinutes: number;
    speakerId?: string;
  }) {
    return this.prisma.agendaItem.create({
      data: {
        eventId,
        title: data.title,
        description: data.description,
        startTime: new Date(data.startTime),
        durationMinutes: Number(data.durationMinutes) || 15,
        speakerId: data.speakerId || null,
        status: AgendaStatus.UPCOMING,
      },
      include: { speaker: true },
    });
  }

  async updateAgendaItem(id: string, data: Partial<{
    title: string;
    description?: string;
    startTime: string;
    durationMinutes: number;
    status: AgendaStatus;
    speakerId?: string | null;
  }>) {
    const updatePayload: Record<string, any> = { ...data };
    if (data.startTime) {
      updatePayload.startTime = new Date(data.startTime);
    }
    if (data.durationMinutes !== undefined) {
      updatePayload.durationMinutes = Number(data.durationMinutes);
    }
    if (data.speakerId === "") {
      updatePayload.speakerId = null;
    }

    return this.prisma.agendaItem.update({
      where: { id },
      data: updatePayload,
      include: { speaker: true },
    });
  }

  async deleteAgendaItem(id: string) {
    return this.prisma.agendaItem.delete({
      where: { id },
    });
  }

  async applyDelay(eventId: string, itemId: string, delayMinutes: number) {
    const items = await this.prisma.agendaItem.findMany({
      where: { eventId },
      orderBy: { startTime: "asc" },
    });

    const targetIndex = items.findIndex((item) => item.id === itemId);
    if (targetIndex === -1) {
      throw new NotFoundException("Agenda item not found");
    }

    const updatedItems = [];
    const delayMs = delayMinutes * 60 * 1000;

    for (let i = targetIndex; i < items.length; i++) {
      const item = items[i];
      const newStart = new Date(item.startTime.getTime() + delayMs);
      const updated = await this.prisma.agendaItem.update({
        where: { id: item.id },
        data: {
          startTime: newStart,
          status: i === targetIndex ? AgendaStatus.DELAYED : item.status,
        },
      });
      updatedItems.push(updated);
    }

    await this.prisma.scheduleChange.create({
      data: {
        eventId,
        reason: `Delayed by ${delayMinutes} minutes starting from ${items[targetIndex].title}`,
        oldStart: items[targetIndex].startTime,
        newStart: new Date(items[targetIndex].startTime.getTime() + delayMs),
        approved: true,
      },
    });

    return {
      success: true,
      delayedMinutes: delayMinutes,
      affectedItemsCount: updatedItems.length,
    };
  }

  // --- Speaker Management ---
  async addSpeaker(eventId: string, data: {
    name: string;
    designation?: string;
    organization?: string;
    biography?: string;
    expertise?: string[];
  }) {
    return this.prisma.speaker.create({
      data: {
        eventId,
        name: data.name,
        designation: data.designation,
        organization: data.organization,
        biography: data.biography,
        expertise: data.expertise ?? [],
      },
    });
  }

  async updateSpeaker(id: string, data: Partial<{
    name: string;
    designation?: string;
    organization?: string;
    biography?: string;
    expertise?: string[];
  }>) {
    return this.prisma.speaker.update({
      where: { id },
      data,
    });
  }

  async deleteSpeaker(id: string) {
    return this.prisma.speaker.delete({
      where: { id },
    });
  }

  // --- Script Management ---
  async saveScript(eventId: string, data: {
    type: ScriptType;
    content: string;
    durationSec?: number;
    aiGenerated?: boolean;
  }) {
    return this.prisma.script.create({
      data: {
        eventId,
        type: data.type,
        content: data.content,
        durationSec: data.durationSec ?? 60,
        aiGenerated: data.aiGenerated ?? true,
      },
    });
  }

  // --- Seed Demo Event ---
  async seedDemoEvent() {
    const existing = await this.prisma.event.findFirst({
      where: { name: "InnovateX 2026: Annual Tech Summit & Hackathon" },
    });

    if (existing) {
      return existing;
    }

    const today = new Date();
    today.setHours(9, 0, 0, 0);

    const event = await this.prisma.event.create({
      data: {
        name: "InnovateX 2026: Annual Tech Summit & Hackathon",
        description:
          "The premier annual inter-collegiate technology symposium bringing together 500+ student innovators, industry leaders, and researchers.",
        venue: "Main Auditorium & Hall B, Tech Campus",
        date: today,
        status: EventStatus.LIVE,
        speakers: {
          create: [
            {
              name: "Dr. Aisha Sharma",
              designation: "Chief AI Scientist",
              organization: "NovaLabs Research",
              biography:
                "Pioneer in Generative AI and Autonomous Agentic architectures with 15+ patents and bestselling author of 'Thinking with Machines'.",
              expertise: ["Generative AI", "LLM Reasoning", "Autonomous Agents"],
            },
            {
              name: "Rahul Verma",
              designation: "VP of Engineering",
              organization: "CloudScale Global",
              biography:
                "Veteran distributed systems architect responsible for scaling real-time infrastructure to over 20 million peak concurrent users.",
              expertise: ["Distributed Systems", "Cloud Resilience", "High-Throughput APIs"],
            },
            {
              name: "Sarah Jenkins",
              designation: "Director of Product Innovation",
              organization: "NextGen Robotics",
              biography:
                "Leading pioneer at the intersection of computer vision, collaborative robotics, and human-machine symbiotic workflows.",
              expertise: ["Robotics", "Human-AI Interface", "Hardware Prototyping"],
            },
          ],
        },
      },
      include: { speakers: true },
    });

    const sp1 = event.speakers.find((s) => s.name.includes("Aisha"));
    const sp2 = event.speakers.find((s) => s.name.includes("Rahul"));
    const sp3 = event.speakers.find((s) => s.name.includes("Sarah"));

    const makeTime = (hours: number, minutes: number) => {
      const d = new Date(today);
      d.setHours(hours, minutes, 0, 0);
      return d;
    };

    await this.prisma.agendaItem.createMany({
      data: [
        {
          eventId: event.id,
          title: "Opening Ceremony & Anchor Welcome",
          description: "Welcome address, lamp lighting, dignitaries felicitations and code of conduct.",
          startTime: makeTime(9, 0),
          durationMinutes: 20,
          status: AgendaStatus.COMPLETED,
        },
        {
          eventId: event.id,
          speakerId: sp1?.id,
          title: "Keynote: The Next Frontier in Agentic AI",
          description: "Deep dive into multi-agent systems, self-healing software, and real-world enterprise adoption.",
          startTime: makeTime(9, 20),
          durationMinutes: 40,
          status: AgendaStatus.LIVE,
        },
        {
          eventId: event.id,
          title: "Networking Tea & Innovation Showcase",
          description: "Audience networking, project booth demonstrations, and refreshments in the foyer.",
          startTime: makeTime(10, 0),
          durationMinutes: 20,
          status: AgendaStatus.UPCOMING,
        },
        {
          eventId: event.id,
          speakerId: sp2?.id,
          title: "Masterclass: Scaling from Prototype to 10M Users",
          description: "Hard-won architectural lessons in database sharding, latency mitigation, and failover engineering.",
          startTime: makeTime(10, 20),
          durationMinutes: 35,
          status: AgendaStatus.UPCOMING,
        },
        {
          eventId: event.id,
          speakerId: sp3?.id,
          title: "Spotlight: Embodied AI & Collaborative Robotics",
          description: "Live demo of collaborative robotics and vision-guided automation systems.",
          startTime: makeTime(10, 55),
          durationMinutes: 35,
          status: AgendaStatus.UPCOMING,
        },
        {
          eventId: event.id,
          title: "Hackathon Track Reveal & Mentor Handoff",
          description: "Announcement of problem statements, API sponsors, evaluation rubrics, and team check-in.",
          startTime: makeTime(11, 30),
          durationMinutes: 30,
          status: AgendaStatus.UPCOMING,
        },
        {
          eventId: event.id,
          title: "Vote of Thanks & Stage Wrap-Up",
          description: "Formal gratitude to college management, sponsors, volunteers, and anchor closing remarks.",
          startTime: makeTime(12, 0),
          durationMinutes: 15,
          status: AgendaStatus.UPCOMING,
        },
      ],
    });

    await this.prisma.script.createMany({
      data: [
        {
          eventId: event.id,
          type: ScriptType.OPENING,
          content:
            "Good morning distinguished guests, respected faculty members, and energetic innovators! Welcome to InnovateX 2026 — the pinnacle of technological creativity and collegiate brilliance. Today, more than 500 builders gather under one roof to redefine what is possible with code, hardware, and boundless imagination. Please ensure your phones are on silent, settle into your seats, and get ready for an unforgettable day!",
          durationSec: 45,
          aiGenerated: true,
        },
        {
          eventId: event.id,
          type: ScriptType.INTRODUCTION,
          content:
            "Ladies and gentlemen, it is an absolute honor to introduce our morning keynote speaker. Holding over 15 international patents and recognized worldwide as a pioneer in Generative AI architectures, she serves as Chief AI Scientist at NovaLabs Research. Put your hands together for the author of 'Thinking with Machines', Dr. Aisha Sharma!",
          durationSec: 40,
          aiGenerated: true,
        },
        {
          eventId: event.id,
          type: ScriptType.TRANSITION,
          content:
            "What an electrifying keynote by Dr. Aisha Sharma! Let's give her another massive round of applause. We now have a quick 20-minute networking and coffee break in the main foyer. Grab your refreshments, check out the interactive demo booths, and we will reconvene promptly at 10:20 AM for Rahul Verma's cloud scalability masterclass!",
          durationSec: 35,
          aiGenerated: true,
        },
        {
          eventId: event.id,
          type: ScriptType.CLOSING,
          content:
            "As we conclude this morning's stage proceedings, we extend our heartfelt gratitude to our visionary speakers, the organizing committee, our generous sponsors, and every student in the audience. The stage is set, the problem statements are live, and the 24-hour hackathon begins now. Code boldly, innovate fearlessly, and have a phenomenal summit!",
          durationSec: 50,
          aiGenerated: true,
        },
      ],
    });

    return event;
  }
}
