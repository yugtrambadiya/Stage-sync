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
  )?.content || `"Welcome everyone. We are currently live with: ${currentItem?.title || "Session"}. Deliver with passion and confidence."`;

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
      background: "#030712",
      color: "#f9fafb",
      padding: "20px 24px 60px",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between"
    }}>
      {/* Top Banner Alert */}
      {bannerAlert && (
        <div style={{
          background: "#dc2626",
          color: "white",
          padding: "16px 24px",
          borderRadius: 12,
          fontSize: 20,
          fontWeight: 800,
          textAlign: "center",
          marginBottom: 16,
          boxShadow: "0 0 20px rgba(220, 38, 38, 0.6)",
          animation: "pulse-dot 1.5s infinite"
        }}>
          ⚡ LIVE URGENT: {bannerAlert}
        </div>
      )}

      {/* Top Stage Bar */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, borderBottom: "1px solid #1f2937", paddingBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Link href="/" style={{ color: "#9ca3af", textDecoration: "none", fontSize: 13, background: "#111827", padding: "6px 12px", borderRadius: 6 }}>
              ← Exit to Dashboard
            </Link>
            <span style={{
              background: "#ef4444", color: "white", padding: "4px 12px", borderRadius: 999,
              fontSize: 12, fontWeight: 800, letterSpacing: "0.08em"
            }}>
              ● ON STAGE LIVE
            </span>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#e5e7eb" }}>
              {event?.name}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 12, color: "#6b7280" }}>Prompter Text Size:</span>
            <button onClick={() => setFontSize((f) => Math.max(16, f - 2))} style={{ background: "#1f2937", color: "white", padding: "4px 10px", borderRadius: 4, fontWeight: 700 }}>A-</button>
            <button onClick={() => setFontSize((f) => Math.min(36, f + 2))} style={{ background: "#1f2937", color: "white", padding: "4px 10px", borderRadius: 4, fontWeight: 700 }}>A+</button>
          </div>
        </div>

        {/* Big HUD Header */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: 20,
          background: "#111827",
          padding: 24,
          borderRadius: 16,
          border: "2px solid #374151",
          marginBottom: 24
        }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#ef4444", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
              Current Activity #{activeIdx + 1} of {event?.agendaItems.length || 0}
            </div>
            <h1 style={{ fontSize: 32, fontWeight: 900, lineHeight: 1.2, margin: 0 }}>
              {currentItem?.title || "Stage Preparation"}
            </h1>
            <p style={{ color: "#9ca3af", fontSize: 15, marginTop: 6 }}>
              {currentItem?.description || "Ongoing scheduled segment"}
            </p>

            {currentItem?.speaker && (
              <div style={{ marginTop: 12, display: "inline-flex", alignItems: "center", gap: 10, background: "#1e1b4b", padding: "6px 14px", borderRadius: 8, border: "1px solid #4338ca" }}>
                <span style={{ fontSize: 16 }}>🎤</span>
                <div>
                  <span style={{ fontWeight: 800, color: "#c7d2fe", fontSize: 14 }}>{currentItem.speaker.name}</span>
                  <span style={{ color: "#818cf8", fontSize: 12 }}> • {currentItem.speaker.designation}</span>
                </div>
              </div>
            )}
          </div>

          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            background: "#030712", borderRadius: 12, border: "1px solid #1f2937", padding: 16
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase" }}>Time Remaining</div>
            <div style={{
              fontSize: 54, fontWeight: 900, fontFamily: "monospace",
              color: secondsLeft < 180 ? "#ef4444" : "#10b981",
              letterSpacing: "-0.04em"
            }}>
              {formatClock(secondsLeft)}
            </div>
            <div style={{ fontSize: 11, color: "#6b7280" }}>Planned: {currentItem?.durationMinutes || 20}m</div>
          </div>
        </div>

        {/* Teleprompter Speech Box */}
        <div style={{
          background: "#090d16",
          border: "1px solid #1f2937",
          borderRadius: 16,
          padding: 32,
          boxShadow: "inset 0 2px 8px rgba(0,0,0,0.6)"
        }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#60a5fa", letterSpacing: "0.08em", marginBottom: 16 }}>
            📜 LIVE TELEPROMPTER / ANCHOR CUE CARD
          </div>
          <div style={{
            fontSize: `${fontSize}px`,
            lineHeight: 1.8,
            color: "#f3f4f6",
            fontFamily: "Georgia, serif",
            whiteSpace: "pre-wrap"
          }}>
            {relevantScript}
          </div>
        </div>
      </div>

      {/* Bottom Footer Control */}
      <div style={{
        marginTop: 24,
        background: "#111827",
        borderRadius: 14,
        padding: "16px 24px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        border: "1px solid #1f2937"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={handlePrev}
            disabled={activeIdx === 0}
            style={{
              background: "#1f2937", color: "white", padding: "10px 18px", borderRadius: 8,
              fontWeight: 700, opacity: activeIdx === 0 ? 0.4 : 1
            }}
          >
            ← Previous Activity
          </button>
          <button
            onClick={handleNext}
            disabled={!nextItem}
            style={{
              background: "#6366f1", color: "white", padding: "10px 20px", borderRadius: 8,
              fontWeight: 800, boxShadow: "0 2px 10px rgba(99, 102, 241, 0.4)"
            }}
          >
            Advance to Next Activity →
          </button>
        </div>

        {nextItem && (
          <div style={{ textAlign: "right" }}>
            <span style={{ fontSize: 11, color: "#9ca3af", textTransform: "uppercase" }}>Up Next: </span>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#e5e7eb" }}>{nextItem.title}</span>
            <span style={{ fontSize: 12, color: "#6b7280" }}> ({nextItem.durationMinutes}m)</span>
          </div>
        )}
      </div>
    </div>
  );
}
