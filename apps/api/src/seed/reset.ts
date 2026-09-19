/**
 * Reset: wipe seeded data and re-seed.
 * Run: pnpm db:reset
 * Safe: deletes only the seeded event's data (id=evt_technova_2025), not other events.
 * Transactional: a failed reset leaves the DB unchanged.
 */

import { PrismaClient } from '@prisma/client';
import { runSeed } from './seed';

const SEEDED_EVENT_ID = 'evt_technova_2025';

export async function runReset(prisma: PrismaClient) {
  console.log('\n♻️   Resetting demo data …');

  // FK-safe deletion order — wrapped in a transaction for atomicity
  await prisma.$transaction(async tx => {
    // Delete schedule changes for this event
    const { count: sc } = await tx.scheduleChange.deleteMany({ where: { eventId: SEEDED_EVENT_ID } });
    console.log(`  - Deleted ${sc} schedule changes`);

    // Delete panel speaker slots
    const { count: ps } = await tx.agendaItemSpeaker.deleteMany({
      where: { agendaItem: { eventId: SEEDED_EVENT_ID } },
    });
    console.log(`  - Deleted ${ps} panel speaker slots`);

    // Delete agenda items
    const { count: ai } = await tx.agendaItem.deleteMany({ where: { eventId: SEEDED_EVENT_ID } });
    console.log(`  - Deleted ${ai} agenda items`);

    // Delete speakers
    const { count: sp } = await tx.speaker.deleteMany({ where: { eventId: SEEDED_EVENT_ID } });
    console.log(`  - Deleted ${sp} speakers`);

    // Delete scripts
    const { count: sc2 } = await tx.script.deleteMany({ where: { eventId: SEEDED_EVENT_ID } });
    console.log(`  - Deleted ${sc2} scripts`);

    // Delete event
    await tx.event.deleteMany({ where: { id: SEEDED_EVENT_ID } });
    console.log('  - Deleted event');
  });

  // Re-seed
  return runSeed(prisma);
}

// ──── CLI entry point ────
if (require.main === module) {
  const client = new PrismaClient();
  runReset(client)
    .catch(err => { console.error(err); process.exit(1); })
    .finally(() => client.$disconnect());
}
