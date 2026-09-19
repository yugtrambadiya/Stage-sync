"use client";

import React from "react";
import { EventDetail } from "../../lib/api";

interface AnnouncementsTabProps {
  currentEvent: EventDetail | null;
  delayMinutes: number;
  setDelayMinutes: (v: number) => void;
  delayReason: string;
  setDelayReason: (v: string) => void;
  recoveryData: any;
  recovering: boolean;
  announcementMsg: string;
  setAnnouncementMsg: (v: string) => void;
  onGenerateDelayRecovery: () => void;
  onBroadcastAnnouncement: () => void;
}

export default function AnnouncementsTab({
  currentEvent,
  delayMinutes,
  setDelayMinutes,
  delayReason,
  setDelayReason,
  recoveryData,
  recovering,
  announcementMsg,
  setAnnouncementMsg,
  onGenerateDelayRecovery,
  onBroadcastAnnouncement,
}: AnnouncementsTabProps) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
      {/* Delay Recovery */}
      <div className="card-box">
        <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>AI Schedule Delay Assistant</h2>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 14 }}>
          Generate graceful spoken announcements and audience engagement prompts when schedule slips.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>
              Delay Duration
            </label>
            <div style={{ display: "flex", gap: 6 }}>
              {[5, 10, 15, 20].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setDelayMinutes(m)}
                  className={`btn ${delayMinutes === m ? "btn-warning" : "btn-secondary"}`}
                  style={{ padding: "6px 12px" }}
                >
                  +{m} mins
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>
              Delay Reason
            </label>
            <input
              style={{ width: "100%" }}
              value={delayReason}
              onChange={(e) => setDelayReason(e.target.value)}
              placeholder="e.g. Speaker transit, AV adjustment"
            />
          </div>

          <button
            className="btn btn-warning"
            onClick={onGenerateDelayRecovery}
            disabled={recovering}
          >
            {recovering ? "Generating..." : "Generate Recovery Announcement"}
          </button>

          {recoveryData && (
            <div style={{ marginTop: 12, background: "#f8fafc", border: "1px solid var(--border-subtle)", padding: 14, borderRadius: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#b45309", marginBottom: 6 }}>
                RECOMMENDED SPOKEN SCRIPT:
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text-primary)", whiteSpace: "pre-wrap", marginBottom: 12 }}>
                {recoveryData.anchorSpeech}
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#1d4ed8", marginBottom: 4 }}>
                AUDIENCE ENGAGEMENT IDEAS:
              </div>
              <ul style={{ paddingLeft: 16, fontSize: 12, color: "var(--text-secondary)" }}>
                {recoveryData.fillerActionItems?.map((item: string, idx: number) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Flash Announcement */}
      <div className="card-box">
        <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>Broadcast Stage Announcement</h2>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 14 }}>
          Push urgent notice banners to the live stage teleprompter screen.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <textarea
            style={{ width: "100%", minHeight: 90 }}
            placeholder="Type urgent announcement here... (e.g. Lunch served in Hall B, Teams check-in with registration desk)"
            value={announcementMsg}
            onChange={(e) => setAnnouncementMsg(e.target.value)}
          />

          <button
            className="btn btn-primary"
            onClick={onBroadcastAnnouncement}
            disabled={!announcementMsg.trim()}
          >
            Broadcast to Live HUD
          </button>

          <div style={{ marginTop: 14, borderTop: "1px solid var(--border-subtle)", paddingTop: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 6 }}>
              Schedule Change History ({currentEvent?.changes?.length || 0})
            </div>
            {currentEvent?.changes && currentEvent.changes.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {currentEvent.changes.slice(0, 4).map((ch) => (
                  <div key={ch.id} style={{ fontSize: 12, background: "#f8fafc", border: "1px solid #e2e8f0", padding: "6px 10px", borderRadius: 6, color: "var(--text-secondary)" }}>
                    [!] {ch.reason} <span style={{ color: "var(--text-muted)" }}> - {new Date(ch.createdAt).toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>No schedule changes recorded.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}