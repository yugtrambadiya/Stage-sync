/**
 * TechNova 2025 — Realistic seed data for demo.
 * Run: pnpm db:seed
 * Idempotent — safe to run multiple times. Uses upsert with deterministic IDs.
 */

import { PrismaClient } from '@prisma/client';

// ──────────────── Deterministic IDs ────────────────
// Using fixed IDs so re-runs produce identical rows.
const EVENT_ID   = 'evt_technova_2025';

const S = {
  COMMITTEE: 'spk_committee',
  ROHAN:     'spk_rohan_verma',
  ANANYA:    'spk_ananya_krishnan',
  KIRAN:     'spk_kiran_desai',
  MEERA:     'spk_meera_joshi',
  ARJUN:     'spk_arjun_malhotra',
  PRIYA:     'spk_priya_mehta',
  SID:       'spk_siddharth_rao',
  PATEL:     'spk_s_patel',
  PROF_IYER: 'spk_prof_iyer',
  VC_KAPOOR: 'spk_vc_kapoor',
  CTO_SHAH:  'spk_cto_shah',
  JURY:      'spk_jury_panel',
};

const A = {
  OPENING:     'agt_opening',
  KEYNOTE:     'agt_keynote',
  WASM:        'agt_wasm_talk',
  PANEL:       'agt_startup_panel',
  LUNCH:       'agt_lunch',
  WORKSHOP:    'agt_llm_workshop',
  OPENSOURCE:  'agt_opensource_talk',
  HACKATHON:   'agt_hackathon_results',
  CLOSING:     'agt_closing',
};

/** Convert IST (Asia/Kolkata) time to UTC Date for a given date */
function ist(date: string, timeHHMM: string): Date {
  const [h, m] = timeHHMM.split(':').map(Number);
  // IST = UTC + 5:30
  const d = new Date(`${date}T00:00:00.000Z`);
  d.setUTCHours(h - 5, m - 30, 0, 0);
  if (m < 30) { d.setUTCHours(h - 6, m + 30, 0, 0); }
  return d;
}

const EVENT_DATE = process.env.SEED_EVENT_DATE && process.env.SEED_EVENT_DATE.trim() !== ''
  ? process.env.SEED_EVENT_DATE
  : '2025-09-19';
const TZ = 'Asia/Kolkata';

export async function runSeed(prisma: PrismaClient) {
  console.log(`\n🌱  Seeding TechNova 2025 (date=${EVENT_DATE}) …`);

  // ──── Event ────
  await prisma.event.upsert({
    where:  { id: EVENT_ID },
    update: {},
    create: {
      id:          EVENT_ID,
      name:        'TechNova 2025 — Annual Technical Symposium',
      description: 'A flagship full-day technical symposium featuring keynotes, hands-on workshops, an industry panel, and the TechNova Hackathon awards. Hosted by the Department of Computer Science & Engineering.',
      venue:       'Main Auditorium & Workshop Halls, Block A',
      date:        new Date(`${EVENT_DATE}T00:00:00.000Z`),
      timezone:    TZ,
      status:      'LIVE',
    },
  });

  // ──── Speakers ────
  const speakerData = [
    {
      id: S.COMMITTEE, name: 'Organizing Committee', designation: 'Student Organizers',
      organization: 'TechNova 2025', biography: 'The TechNova Organizing Committee is a team of 40+ students from the Dept. of CSE who plan and run the symposium end-to-end — from logistics to AV coordination and hospitality.', expertise: ['Event Management'],
    },
    {
      id: S.ROHAN, name: 'Dr. Rohan Verma', designation: 'Professor & Head, AI-at-Edge Lab',
      organization: 'IIT Bombay', biography: 'Dr. Rohan Verma leads the AI-at-Edge Laboratory at IIT Bombay, where his team develops lightweight ML models for inference on IoT and mobile hardware. He holds a PhD from Carnegie Mellon, has authored 3 textbooks on distributed learning, and advises four deep-tech startups in the embedded AI space.', expertise: ['Edge AI', 'Federated Learning', 'Embedded ML', 'IoT'],
    },
    {
      id: S.ANANYA, name: 'Ananya Krishnan', designation: 'Senior Staff Engineer, Platform',
      organization: 'Flipkart', biography: 'Ananya is a core member of Flipkart\'s platform engineering team. She led the initiative that shipped WebAssembly-powered search ranking to over 50 million monthly active users, reducing client-side bundle size by 38%. She is a frequent speaker at WasmCon and an open-source contributor to Wasmtime.', expertise: ['WebAssembly', 'Performance Engineering', 'Rust', 'Platform'],
    },
    {
      id: S.KIRAN, name: 'Kiran Desai', designation: 'Developer Advocate, AI/ML',
      organization: 'Google', biography: 'Kiran Desai is a Developer Advocate at Google focused on large language models and developer tooling. A former startup founder (Contextly — acquired 2022), he now helps engineering teams worldwide integrate LLM capabilities responsibly. He writes a widely-read newsletter on AI product design with 80k+ subscribers.', expertise: ['LLMs', 'Developer Experience', 'Generative AI', 'Prompt Engineering'],
    },
    {
      id: S.MEERA, name: 'Meera Joshi', designation: 'Principal Engineer & Open Source Lead',
      organization: 'Mozilla', biography: 'Meera has been an active Mozilla contributor since 2012 and joined the organization full-time in 2017. She maintains two foundational Rust crates, contributes to MDN documentation, and mentors contributors through the Outreachy and Google Summer of Code programs. She is a passionate advocate for open internet standards and accessible tech careers.', expertise: ['Open Source', 'Rust', 'Web Standards', 'Community Building'],
    },
    {
      id: S.ARJUN, name: 'Arjun Malhotra', designation: 'Co-founder & CEO',
      organization: 'DevStack (YC W21)', biography: 'Arjun co-founded DevStack, a developer-tools SaaS that helps engineering teams manage infrastructure drift at scale. He grew it from a college side project to a Series B company backed by Sequoia and YC. Before DevStack, Arjun worked at Razorpay building payment gateway integrations. He actively angel-invests in early-stage devtools startups.', expertise: ['Developer Tools', 'SaaS', 'Fundraising', 'Product-Led Growth'],
    },
    {
      id: S.PRIYA, name: 'Priya Mehta', designation: 'CTO',
      organization: 'AgroLink', biography: 'Priya is CTO at AgroLink, an agritech startup connecting 200,000+ farmers to commodity markets via a lightweight mobile app. She built the entire ML pipeline for crop price predictions and demand forecasting. Formerly at Amazon, Priya holds patents in distributed systems and has spoken at SREcon and PyCon India.', expertise: ['Machine Learning', 'AgriTech', 'Distributed Systems', 'Python'],
    },
    {
      id: S.SID, name: 'Siddharth Rao', designation: 'VP of Product',
      organization: 'Postman', biography: 'Siddharth was one of the first product hires at Postman India and helped scale the product from 2M to 25M developers over 4 years. He leads the API Testing and Collaboration product lines. Previously at Truecaller and Ola, he has a deep understanding of product-market fit in highly competitive developer and consumer markets.', expertise: ['Product Management', 'API Design', 'Developer Products', 'Growth'],
    },
    {
      id: S.PATEL, name: 'Dr. S. Patel', designation: 'Director',
      organization: 'Institute of Technology', biography: 'Dr. Suresh Patel has served as the Director of the Institute of Technology for over 20 years. Under his leadership, the institute achieved NAAC A++ accreditation and established 12 industry research centers. He holds a PhD in Computer Networks from IIT Delhi and has guided 35 doctoral students.', expertise: ['Academic Leadership', 'Computer Networks', 'Research Policy'],
    },
    {
      id: S.PROF_IYER, name: 'Prof. Nalini Iyer', designation: 'Professor of CS & Jury Chair',
      organization: 'BITS Pilani', biography: 'Prof. Nalini Iyer is a respected academic with 18 years of research in distributed computing and systems design. As this year\'s Jury Chair, she brings a rigorous evaluation framework to the TechNova Hackathon judging process. She has supervised over 60 student teams at national hackathons.', expertise: ['Distributed Computing', 'Hackathon Judging', 'Systems Research'],
    },
    {
      id: S.VC_KAPOOR, name: 'Rahul Kapoor', designation: 'Partner',
      organization: 'Blume Ventures', biography: 'Rahul leads early-stage technology investments at Blume Ventures, with a portfolio spanning dev-tools, edtech, and climate-tech. He has made 45 seed investments since joining Blume in 2018, three of which have grown to unicorn valuations. He is also a mentor at IIT Bombay\'s E-Cell.', expertise: ['Venture Capital', 'Startup Investments', 'Dev-Tools', 'Climate Tech'],
    },
    {
      id: S.CTO_SHAH, name: 'Nisha Shah', designation: 'CTO & Co-founder',
      organization: 'FinBridge Technologies', biography: 'Nisha co-founded FinBridge, a B2B fintech platform processing ₹2,000 crore in monthly transactions for SMEs. With a background in financial cryptography and secure distributed systems, she brings a practitioner\'s lens to evaluating technical projects. She is a visiting faculty at IIMB for tech entrepreneurship.', expertise: ['Fintech', 'Security', 'Distributed Ledgers', 'Entrepreneurship'],
    },
    {
      id: S.JURY, name: 'Hackathon Jury', designation: 'Evaluation Panel',
      organization: 'TechNova 2025', biography: 'The TechNova 2025 Hackathon Jury comprises industry veterans and academics who evaluate projects on innovation, technical depth, real-world impact, and presentation quality.', expertise: ['Technical Evaluation', 'Innovation Assessment'],
    },
  ];

  for (const s of speakerData) {
    await prisma.speaker.upsert({
      where:  { id: s.id },
      update: {},
      create: {
        id:           s.id,
        eventId:      EVENT_ID,
        name:         s.name,
        designation:  s.designation,
        organization: s.organization,
        biography:    s.biography,
        expertise:    s.expertise,
      },
    });
  }
  console.log(`  ✓ ${speakerData.length} speakers upserted`);

  // ──── Agenda Items ────
  type AgendaUpsert = {
    id: string; title: string; description: string;
    time: string; duration: number; speakerId: string | null;
    status: 'UPCOMING' | 'DELAYED' | 'LIVE';
  };

  const agendaData: AgendaUpsert[] = [
    {
      id: A.OPENING, title: 'Opening Ceremony', speakerId: S.COMMITTEE, time: '09:00', duration: 30, status: 'UPCOMING',
      description: 'Welcome address, lighting of the lamp, and introduction to TechNova 2025 by the Organizing Committee.',
    },
    {
      id: A.KEYNOTE, title: 'Keynote: "AI at the Edge"', speakerId: S.ROHAN, time: '09:30', duration: 60, status: 'DELAYED',
      description: 'Dr. Rohan Verma explores how next-generation AI models are shrinking to run on edge devices — from wearables to agricultural drones — without cloud connectivity. Live demo included.',
    },
    {
      id: A.WASM, title: 'Talk: "WebAssembly in Production"', speakerId: S.ANANYA, time: '10:30', duration: 60, status: 'UPCOMING',
      description: 'Ananya Krishnan shares a candid engineering retrospective on shipping WASM-powered features to 50M Flipkart users — the performance wins, the surprising failures, and what she would do differently.',
    },
    {
      id: A.PANEL, title: 'Panel: "Startup Realities — From Dorm Room to Series B"', speakerId: S.ARJUN, time: '11:30', duration: 30, status: 'UPCOMING',
      description: 'Three founders discuss the unfiltered reality of building startups from college campuses — hiring, fundraising, pivoting under pressure, and staying technical as a CEO.',
    },
    {
      id: A.LUNCH, title: 'Networking Lunch', speakerId: null, time: '12:00', duration: 60, status: 'UPCOMING',
      description: 'Buffet lunch in the main foyer. A great opportunity to network with speakers, recruiters, and fellow delegates.',
    },
    {
      id: A.WORKSHOP, title: 'Workshop: "Building Production Apps with LLMs"', speakerId: S.KIRAN, time: '13:00', duration: 90, status: 'UPCOMING',
      description: 'Kiran Desai leads a hands-on 90-minute workshop. Participants will build a context-aware AI assistant with retrieval-augmented generation (RAG), structured outputs, and production-grade error handling. Laptops required.',
    },
    {
      id: A.OPENSOURCE, title: 'Talk: "Your First Open Source Career Move"', speakerId: S.MEERA, time: '14:30', duration: 60, status: 'UPCOMING',
      description: 'Meera Joshi shares a practical, step-by-step guide to landing your first impactful open source contribution — picking the right project, navigating codebases you didn\'t write, and converting OSS work into career opportunities.',
    },
    {
      id: A.HACKATHON, title: 'TechNova Hackathon — Results & Awards Ceremony', speakerId: S.JURY, time: '15:30', duration: 30, status: 'UPCOMING',
      description: 'The Hackathon Jury announces the winners of the TechNova 2025 Hackathon across four tracks: AI/ML, Web3, Sustainability, and Open Innovation. Cash prizes, internship offers, and trophies.',
    },
    {
      id: A.CLOSING, title: 'Closing Ceremony', speakerId: S.PATEL, time: '16:00', duration: 30, status: 'UPCOMING',
      description: 'Director Dr. S. Patel delivers the closing address, thanks the organizing committee, speakers, sponsors, and delegates, and announces the date for TechNova 2026.',
    },
  ];

  for (const a of agendaData) {
    await prisma.agendaItem.upsert({
      where:  { id: a.id },
      update: {},
      create: {
        id:              a.id,
        eventId:         EVENT_ID,
        speakerId:       a.speakerId,
        title:           a.title,
        description:     a.description,
        startTime:       ist(EVENT_DATE, a.time),
        durationMinutes: a.duration,
        status:          a.status,
      },
    });
  }
  console.log(`  ✓ ${agendaData.length} agenda items upserted`);

  // ──── Panel speakers (AgendaItemSpeaker join) ────
  const panelSpeakers = [
    { agendaItemId: A.PANEL, speakerId: S.ARJUN, role: 'LEAD_PANELIST'  },
    { agendaItemId: A.PANEL, speakerId: S.PRIYA, role: 'PANELIST'        },
    { agendaItemId: A.PANEL, speakerId: S.SID,   role: 'PANELIST'        },
    { agendaItemId: A.HACKATHON, speakerId: S.PROF_IYER, role: 'JURY'   },
    { agendaItemId: A.HACKATHON, speakerId: S.VC_KAPOOR, role: 'JURY'   },
    { agendaItemId: A.HACKATHON, speakerId: S.CTO_SHAH,  role: 'JURY'   },
  ];

  for (const ps of panelSpeakers) {
    await prisma.agendaItemSpeaker.upsert({
      where:  { agendaItemId_speakerId: { agendaItemId: ps.agendaItemId, speakerId: ps.speakerId } },
      update: { role: ps.role },
      create: ps,
    });
  }
  console.log(`  ✓ ${panelSpeakers.length} panel speaker slots upserted`);

  // ──── Pre-seed ScheduleChange history (keynote delay history) ────
  const historyId = 'schg_keynote_delay_initial';
  const existing = await prisma.scheduleChange.findUnique({ where: { id: historyId } });
  if (!existing) {
    await prisma.scheduleChange.create({
      data: {
        id:           historyId,
        eventId:      EVENT_ID,
        agendaItemId: A.KEYNOTE,
        batchId:      'batch_initial_delay',
        changeType:   'DELAY',
        delayMinutes: 0,
        reason:       'Speaker travel delay reported — Dr. Rohan Verma flight delayed from Mumbai.',
        approved:     true,
      },
    });
    console.log('  ✓ Pre-seeded schedule change history (keynote delay)');
  }

  // ──── Summary ────
  const [evtCount, spkCount, agdCount] = await Promise.all([
    prisma.event.count(),
    prisma.speaker.count(),
    prisma.agendaItem.count(),
  ]);
  console.log(`\n✅  Seed complete: event=${evtCount} speakers=${spkCount} agenda=${agdCount}`);
  return { events: evtCount, speakers: spkCount, agenda: agdCount };
}

// ──── CLI entry point ────
if (require.main === module) {
  const client = new PrismaClient();
  runSeed(client)
    .catch(err => { console.error(err); process.exit(1); })
    .finally(() => client.$disconnect());
}
