"use client";

import React from "react";
import Link from "next/link";
import { EventDetail } from "../../lib/api";

interface TopHeaderProps {
  currentEvent: EventDetail | null;
  onResetDemo: () => void;
}

export default function TopHeader({ currentEvent, onResetDemo }: TopHeaderProps) {
  return (
    <header className="top-bar">
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span className="brand-badge">
            <span className="status-dot"></span> Stage Copilot
          </span>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>PostgreSQL • Prisma • AI Workflows</span>
        </div>
        <h1 style={{ fontSize: "24px", fontWeight: 700, color: "var(--text-primary)" }}>
          {currentEvent?.name || "Event Stage Flow"}
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 2 }}>
          ?? {currentEvent?.venue || "Main Auditorium"} • ??? {new Date(currentEvent?.date || Date.now()).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
        </p>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {currentEvent && (
          <Link href={`/live/${currentEvent.id}`} target="_blank" className="btn btn-primary" style={{ textDecoration: "none" }}>
            Launch Anchor HUD ?
          </Link>
        )}
        <button onClick={onResetDemo} className="btn btn-secondary">
          Reset Demo Data
        </button>
      </div>
    </header>
  );
}
