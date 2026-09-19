"use client";

import React from "react";
import { EventDetail, AgendaItem } from "../../lib/api";

interface LiveTabProps {
  currentEvent: EventDetail | null;
  activeItemIndex: number;
  secondsRemaining: number;
  currentItem: AgendaItem | undefined;
  nextItem: AgendaItem | undefined;
  formatTimer: (secs: number) => string;
  onUpdateStatus: (item: AgendaItem, status: any) => void;
  onApplyDelay: (itemId: string, mins: number) => void;
  onAdvanceItem: () => void;
  onSetAlert: (msg: string) => void;
}

export default function LiveTab({
  currentEvent,
  activeItemIndex,
  secondsRemaining,
  currentItem,
  nextItem,
  formatTimer,
  onUpdateStatus,
  onApplyDelay,
  onAdvanceItem,
  onSetAlert,
}: LiveTabProps) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 20 }}>
      {/* Active Session Card */}
      <div className="card-box" style={{ borderLeft: "4px solid #dc2626" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="badge-tag badge-live">NOW LIVE</span>
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              Item #{activeItemIndex + 1} of {currentEvent?.agendaItems?.length || 0}
            </span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, fontFamily: "monospace", color: "#dc2626" }}>
            ?? {formatTimer(secondsRemaining)}
          </div>
        </div>

        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>
          {currentItem?.title || "Stage in preparation"}
        </h2>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 14 }}>
          {currentItem?.description || "Scheduled program activity"}
        </p>

        {currentItem?.speaker && (
          <div style={{ background: "#f8fafc", border: "1px solid var(--border-subtle)", padding: 12, borderRadius: 6, marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#2563eb", textTransform: "uppercase" }}>Current Speaker</div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{currentItem.speaker.name}</div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{currentItem.speaker.designation} • {currentItem.speaker.organization}</div>
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 6 }}>
            PROMPTER CUE NOTE:
          </div>
          <div className="teleprompter-box" style={{ fontSize: 15, padding: 14 }}>
            {currentEvent?.scripts?.find((s) => s.type === "OPENING" || s.type === "INTRODUCTION")?.content ||
              `"Introducing ${currentItem?.title || "our next activity"}. Guide the audience with clear transitions and observe stage time."`}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            className="btn btn-primary"
            style={{ background: "#059669", flex: 1 }}
            onClick={onAdvanceItem}
          >
            Advance to Next Item ?
          </button>
          <button
            className="btn btn-warning"
            onClick={() => {
              if (currentItem) onApplyDelay(currentItem.id, 5);
            }}
          >
            +5m Delay
          </button>
        </div>
      </div>

      {/* Up Next Card */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="card-box">
          <div style={{ fontSize: 11, fontWeight: 700, color: "#2563eb", textTransform: "uppercase", marginBottom: 4 }}>
            Up Next on Stage
          </div>
          {nextItem ? (
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{nextItem.title}</h3>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 8 }}>{nextItem.description}</p>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                Planned: {new Date(nextItem.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} • Duration: {nextItem.durationMinutes}m
              </div>
              {nextItem.speaker && (
                <div style={{ marginTop: 6, fontSize: 12, color: "#1d4ed8", fontWeight: 600 }}>
                  ?? Speaker: {nextItem.speaker.name}
                </div>
              )}
            </div>
          ) : (
            <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>
              No further activities scheduled.
            </div>
          )}
        </div>

        <div className="card-box">
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Quick Cue Alerts</h3>
          <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 10 }}>
            Trigger quick cues to the anchor screen.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[
              "? Wrap up in 2 minutes",
              "?? Check microphone audio levels",
              "?? Speaker has arrived backstage",
              "? Refreshments ready in foyer"
            ].map((msg, i) => (
              <button
                key={i}
                className="btn btn-secondary"
                style={{ justifyContent: "flex-start", fontSize: 12, padding: "6px 10px" }}
                onClick={() => onSetAlert(msg)}
              >
                {msg}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
