'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import './EventNav.css';

interface Props {
  eventId: string;
  eventName?: string;
}

export function EventNav({ eventId, eventName }: Props) {
  const pathname = usePathname();

  const isLive = pathname?.endsWith('/live');
  const isSetup = pathname?.endsWith('/setup');
  const isScripts = pathname?.endsWith('/scripts');

  return (
    <nav className="event-nav" aria-label="Event navigation">
      <div className="event-nav__left">
        <Link href="/events" className="event-nav__back">
          ← All Events
        </Link>
        {eventName && <span className="event-nav__title">{eventName}</span>}
      </div>

      <div className="event-nav__tabs">
        <Link
          href={`/events/${eventId}/live`}
          className={`event-nav__tab ${isLive ? 'event-nav__tab--active' : ''}`}
        >
          ● Live Dashboard
        </Link>
        <Link
          href={`/events/${eventId}/setup`}
          className={`event-nav__tab ${isSetup ? 'event-nav__tab--active' : ''}`}
        >
          Setup & Agenda
        </Link>
        <Link
          href={`/events/${eventId}/scripts`}
          className={`event-nav__tab ${isScripts ? 'event-nav__tab--active' : ''}`}
        >
          Scripts History
        </Link>
      </div>
    </nav>
  );
}
