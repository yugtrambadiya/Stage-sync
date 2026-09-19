"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { EventDetail, fetchEventById, updateAgendaItem } from "../../../lib/api";

export default function LiveAnchorHUD() {
  const params = useParams();
  const eventId = params?.id as string;

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [activeIdx, setActiveIdx] = useState<number>(0);
  const [secondsLeft, setSecondsLeft] = useState<number>(1200);
  const [fontSize, setFontSize] = useState<number>(24);
  const [bannerAlert, setBannerAlert] = useState<string | null>(null);

  const loadEvent = async () => {
    if (!eventId) return;
    const data = await fetchEventById(eventId);
    if (data) {
      setEvent(data);
      const liveIndex = data.agendaItems.findIndex((i) => i.status === "LIVE");
      if (liveIndex !== -1) {
        setActiveIdx(liveIndex);
        setSecondsLeft(data.agendaItems[liveIndex].durationMinutes * 60);
      }
    }
  };

  useEffect(() => {
    loadEvent();
  }, [eventId]);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatClock = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const currentItem = event?.agendaItems[activeIdx];
  const nextItem = event?.agendaItems[activeIdx + 1];

  const relevantScript = event?.scripts?.find(
    (s) =>
      s.type === (activeIdx === 0 ? "OPENING" : currentItem?.speakerId ? "INTRODUCTION" : "TRANSITION")
  )?.content || `"Welcome everyone. We are currently live with: ${currentItem?.title || "Session"}. Deliver with clarity and observe scheduled timings."`;

  const handleNext = async () => {
    if (!event || activeIdx >= event.agendaItems.length - 1) return;
    if (currentItem) {
      await updateAgendaItem(event.id, currentItem.id, { status: "COMPLETED" });
    }
    const next = event.agendaItems[activeIdx + 1];
    if (next) {
      await updateAgendaItem(event.id, next.id, { status: "LIVE" });
      setActiveIdx((i) => i + 1);
      setSecondsLeft(next.durationMinutes * 60);
    }
  };

  const handlePrev = () => {
    if (activeIdx > 0) {
      setActiveIdx((i) => i - 1);
      if (event?.agendaItems[activeIdx - 1]) {
        setSecondsLeft(event.agendaItems[activeIdx - 1].durationMinutes * 60);
      }
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#f8fafc",
      color: "#0f172a",
      padding: "20px 24px 60px",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    }}>
      {/* Top Banner Alert */}
      {bannerAlert && (
        <div style={{
          background: "#fee2e2",
          border: "1px solid #fecaca",
          color: "#991b1b",
          padding: "12px 20px",
          borderRadius: 8,
          fontSize: 16,
          fontWeight: 700,
          textAlign: "center",
          marginBottom: 16
        }}>
          📢 URGENT NOTICE: {bannerAlert}
        </div>
      )}

      {/* Top Stage Bar */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, borderBottom: "1px solid #e2e8f0", paddingBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Link href="/" style={{ color: "#475569", textDecoration: "none", fontSize: 13, background: "#ffffff", border: "1px solid #e2e8f0", padding: "6px 12px", borderRadius: 6, fontWeight: 600 }}>
              ← Exit to Dashboard
            </Link>
            <span style={{
              background: "#fee2e2", color: "#991b1b", border: "1px solid #fecaca", padding: "3px 10px", borderRadius: 999,
              fontSize: 11, fontWeight: 700, letterSpacing: "0.04em"
            }}>
              ● LIVE STAGE
            </span>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#1e293b" }}>
              {event?.name}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, color: "#64748b" }}>Text Size:</span>
            <button onClick={() => setFontSize((f) => Math.max(16, f - 2))} style={{ background: "#ffffff", border: "1px solid #e2e8f0", color: "#0f172a", padding: "3px 9px", borderRadius: 4, fontWeight: 700 }}>A-</button>
            <button onClick={() => setFontSize((f) => Math.min(36, f + 2))} style={{ background: "#ffffff", border: "1px solid #e2e8f0", color: "#0f172a", padding: "3px 9px", borderRadius: 4, fontWeight: 700 }}>A+</button>
          </div>
        </div>

        {/* Live Session Status Box */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: 16,
          background: "#ffffff",
          padding: 20,
          borderRadius: 10,
          border: "1px solid #e2e8f0",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          marginBottom: 18
        }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#dc2626", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>
              Current Activity #{activeIdx + 1} of {event?.agendaItems.length || 0}
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 800, lineHeight: 1.2, color: "#0f172a", margin: 0 }}>
              {currentItem?.title || "Stage Preparation"}
            </h1>
            <p style={{ color: "#64748b", fontSize: 14, marginTop: 4 }}>
              {currentItem?.description || "Ongoing scheduled segment"}
            </p>

            {currentItem?.speaker && (
              <div style={{ marginTop: 10, display: "inline-flex", alignItems: "center", gap: 8, background: "#eff6ff", border: "1px solid #dbeafe", padding: "5px 12px", borderRadius: 6 }}>
                <span style={{ fontSize: 14 }}>🎤</span>
                <div>
                  <span style={{ fontWeight: 700, color: "#1e40af", fontSize: 13 }}>{currentItem.speaker.name}</span>
                  <span style={{ color: "#3b82f6", fontSize: 12 }}> • {currentItem.speaker.designation}</span>
                </div>
              </div>
            )}
          </div>

          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0", padding: 12
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Time Remaining</div>
            <div style={{
              fontSize: 48, fontWeight: 900, fontFamily: "monospace",
              color: secondsLeft < 180 ? "#dc2626" : "#059669",
              letterSpacing: "-0.04em"
            }}>
              {formatClock(secondsLeft)}
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8" }}>Allocated: {currentItem?.durationMinutes || 20}m</div>
          </div>
        </div>

        {/* Teleprompter Speech Box */}
        <div style={{
          background: "#ffffff",
          border: "1px solid #cbd5e1",
          borderRadius: 10,
          padding: 24,
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
        }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "#2563eb", letterSpacing: "0.06em", marginBottom: 12 }}>
            TELEPROMPTER / ANCHOR NOTES
          </div>
          <div style={{
            fontSize: `${fontSize}px`,
            lineHeight: 1.75,
            color: "#1e293b",
            fontFamily: "Georgia, serif",
            whiteSpace: "pre-wrap"
          }}>
            {relevantScript}
          </div>
        </div>
      </div>

      {/* Footer Navigation Controls */}
      <div style={{
        marginTop: 20,
        background: "#ffffff",
        borderRadius: 10,
        padding: "14px 20px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        border: "1px solid #e2e8f0",
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={handlePrev}
            disabled={activeIdx === 0}
            style={{
              background: "#ffffff", color: "#334155", border: "1px solid #cbd5e1", padding: "8px 16px", borderRadius: 6,
              fontWeight: 600, fontSize: 13, opacity: activeIdx === 0 ? 0.4 : 1, cursor: activeIdx === 0 ? "not-allowed" : "pointer"
            }}
          >
            ← Previous Activity
          </button>
          <button
            onClick={handleNext}
            disabled={!nextItem}
            style={{
              background: "#2563eb", color: "#ffffff", padding: "8px 18px", borderRadius: 6,
              fontWeight: 600, fontSize: 13, cursor: !nextItem ? "not-allowed" : "pointer"
            }}
          >
            Advance to Next Activity →
          </button>
        </div>

        {nextItem && (
          <div style={{ textAlign: "right" }}>
            <span style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase" }}>Up Next: </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{nextItem.title}</span>
            <span style={{ fontSize: 12, color: "#64748b" }}> ({nextItem.durationMinutes}m)</span>
          </div>
        )}
      </div>
    </div>
  );
}
