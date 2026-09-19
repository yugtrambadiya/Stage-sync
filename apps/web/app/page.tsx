"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  EventDetail,
  AgendaItem,
  Speaker,
  fetchEvents,
  fetchEventById,
  seedDemoEvent,
  addAgendaItem,
  updateAgendaItem,
  deleteAgendaItem,
  applyScheduleDelay,
  addSpeaker,
  deleteSpeaker,
  saveScript,
  generateAiScript,
  generateDelayRecovery,
} from "../lib/api";

export default function StageSyncDashboard() {
  const [events, setEvents] = useState<any[]>([]);
  const [currentEvent, setCurrentEvent] = useState<EventDetail | null>(null);
  const [activeTab, setActiveTab] = useState<"agenda" | "speakers" | "ai-studio" | "live" | "announcements">("agenda");
  const [loading, setLoading] = useState(true);

  // Agenda modal state
  const [showAddAgendaModal, setShowAddAgendaModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newDuration, setNewDuration] = useState(20);
  const [newStartTime, setNewStartTime] = useState("09:00");
  const [newSpeakerId, setNewSpeakerId] = useState("");

  // Speaker modal state
  const [showAddSpeakerModal, setShowAddSpeakerModal] = useState(false);
  const [speakerName, setSpeakerName] = useState("");
  const [speakerRole, setSpeakerRole] = useState("");
  const [speakerOrg, setSpeakerOrg] = useState("");
  const [speakerBio, setSpeakerBio] = useState("");
  const [speakerExpertise, setSpeakerExpertise] = useState("");

  // AI Script Studio state
  const [scriptType, setScriptType] = useState<string>("OPENING");
  const [scriptTone, setScriptTone] = useState<string>("energetic");
  const [selectedSpeakerId, setSelectedSpeakerId] = useState<string>("");
  const [customTopic, setCustomTopic] = useState<string>("");
  const [generatedScript, setGeneratedScript] = useState<string>("");
  const [stageDirections, setStageDirections] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [saveScriptSuccess, setSaveScriptSuccess] = useState(false);

  // Delay Recovery state
  const [delayMinutes, setDelayMinutes] = useState(10);
  const [delayReason, setDelayReason] = useState("AV calibration & speaker handoff");
  const [recoveryData, setRecoveryData] = useState<any>(null);
  const [recovering, setRecovering] = useState(false);

  // Flash Announcement state
  const [announcementMsg, setAnnouncementMsg] = useState("");
  const [activeAlert, setActiveAlert] = useState<string | null>(null);

  // Live timer & prompter
  const [activeItemIndex, setActiveItemIndex] = useState<number>(0);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(1200);

  const loadAll = async () => {
    setLoading(true);
    try {
      let evList = await fetchEvents();
      if (!evList || evList.length === 0) {
        await seedDemoEvent();
        evList = await fetchEvents();
      }
      setEvents(evList);
      if (evList.length > 0) {
        const full = await fetchEventById(evList[0].id);
        setCurrentEvent(full);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  // Update timer based on live agenda item
  useEffect(() => {
    if (currentEvent?.agendaItems && currentEvent.agendaItems.length > 0) {
      const liveIdx = currentEvent.agendaItems.findIndex((i) => i.status === "LIVE");
      if (liveIdx !== -1) {
        setActiveItemIndex(liveIdx);
        setSecondsRemaining(currentEvent.agendaItems[liveIdx].durationMinutes * 60);
      }
    }
  }, [currentEvent]);

  // Clock countdown ticker for live tab
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleCreateAgenda = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentEvent || !newTitle) return;

    const baseDate = new Date(currentEvent.date);
    const [h, m] = newStartTime.split(":");
    baseDate.setHours(parseInt(h || "9", 10), parseInt(m || "0", 10), 0, 0);

    await addAgendaItem(currentEvent.id, {
      title: newTitle,
      description: newDesc,
      startTime: baseDate.toISOString(),
      durationMinutes: Number(newDuration),
      speakerId: newSpeakerId || undefined,
    });

    const refreshed = await fetchEventById(currentEvent.id);
    setCurrentEvent(refreshed);
    setShowAddAgendaModal(false);
    setNewTitle("");
    setNewDesc("");
  };

  const handleUpdateStatus = async (item: AgendaItem, status: any) => {
    if (!currentEvent) return;
    await updateAgendaItem(currentEvent.id, item.id, { status });
    const refreshed = await fetchEventById(currentEvent.id);
    setCurrentEvent(refreshed);
  };

  const handleApplyDelay = async (itemId: string, mins: number) => {
    if (!currentEvent) return;
    await applyScheduleDelay(currentEvent.id, itemId, mins);
    const refreshed = await fetchEventById(currentEvent.id);
    setCurrentEvent(refreshed);
    setActiveAlert(`Schedule shifted +${mins} minutes for downstream sessions.`);
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!currentEvent) return;
    await deleteAgendaItem(currentEvent.id, itemId);
    const refreshed = await fetchEventById(currentEvent.id);
    setCurrentEvent(refreshed);
  };

  const handleAddSpeaker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentEvent || !speakerName) return;

    await addSpeaker(currentEvent.id, {
      name: speakerName,
      designation: speakerRole,
      organization: speakerOrg,
      biography: speakerBio,
      expertise: speakerExpertise ? speakerExpertise.split(",").map((s) => s.trim()) : [],
    });

    const refreshed = await fetchEventById(currentEvent.id);
    setCurrentEvent(refreshed);
    setShowAddSpeakerModal(false);
    setSpeakerName("");
    setSpeakerRole("");
    setSpeakerOrg("");
    setSpeakerBio("");
    setSpeakerExpertise("");
  };

  const handleDeleteSpeaker = async (spId: string) => {
    if (!currentEvent) return;
    await deleteSpeaker(currentEvent.id, spId);
    const refreshed = await fetchEventById(currentEvent.id);
    setCurrentEvent(refreshed);
  };

  const handleGenerateScript = async () => {
    if (!currentEvent) return;
    setGenerating(true);
    setSaveScriptSuccess(false);

    const sp = currentEvent.speakers.find((s) => s.id === selectedSpeakerId);
    const currItem = currentEvent.agendaItems[activeItemIndex];
    const nextItem = currentEvent.agendaItems[activeItemIndex + 1];

    try {
      const res = await generateAiScript({
        type: scriptType,
        tone: scriptTone,
        eventName: currentEvent.name,
        eventType: "College Tech Summit & Hackathon",
        speakerName: sp?.name,
        speakerDesignation: sp?.designation ?? undefined,
        speakerOrg: sp?.organization ?? undefined,
        speakerTopic: customTopic || currItem?.title,
        currentSession: currItem?.title,
        nextSession: nextItem?.title,
        delayMinutes: 10,
        announcementDetails: announcementMsg,
      });

      setGeneratedScript(res.content);
      setStageDirections(res.stageDirections || []);
    } catch (err) {
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveGeneratedScript = async () => {
    if (!currentEvent || !generatedScript) return;
    await saveScript(currentEvent.id, {
      type: scriptType as any,
      content: generatedScript,
      durationSec: Math.round(generatedScript.split(" ").length / 2.5),
      aiGenerated: true,
    });
    setSaveScriptSuccess(true);
    const refreshed = await fetchEventById(currentEvent.id);
    setCurrentEvent(refreshed);
    setTimeout(() => setSaveScriptSuccess(false), 3000);
  };

  const handleGenerateDelayRecovery = async () => {
    if (!currentEvent) return;
    setRecovering(true);
    const currItem = currentEvent.agendaItems[activeItemIndex] || { title: "Current Session" };

    try {
      const res = await generateDelayRecovery({
        eventName: currentEvent.name,
        delayedItemTitle: currItem.title,
        delayMinutes,
        delayReason,
      });
      setRecoveryData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setRecovering(false);
    }
  };

  const handleBroadcastAnnouncement = () => {
    if (!announcementMsg.trim()) return;
    setActiveAlert(announcementMsg);
    setAnnouncementMsg("");
    setTimeout(() => {
      // auto-fade banner after 8s
    }, 8000);
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const currentItem = currentEvent?.agendaItems[activeItemIndex];
  const nextItem = currentEvent?.agendaItems[activeItemIndex + 1];

  if (loading) {
    return (
      <div className="app-container" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "80vh" }}>
        <div style={{ textAlign: "center" }}>
          <div className="status-dot" style={{ width: 18, height: 18, margin: "0 auto 16px" }}></div>
          <p style={{ color: "var(--text-secondary)" }}>Loading Stage-sync Control Room...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Alert Ticker */}
      {activeAlert && (
        <div style={{
          background: "linear-gradient(90deg, #b45309 0%, #d97706 100%)",
          color: "white",
          padding: "12px 20px",
          borderRadius: 8,
          marginBottom: 20,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          boxShadow: "0 4px 12px rgba(217, 119, 6, 0.3)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 600 }}>
            <span>📢 LIVE STAGE ALERT:</span>
            <span>{activeAlert}</span>
          </div>
          <button onClick={() => setActiveAlert(null)} style={{ color: "white", fontWeight: 700, padding: "2px 8px" }}>✕</button>
        </div>
      )}

      {/* Top Bar */}
      <header className="top-bar">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
            <span className="brand-badge">
              <span className="status-dot"></span> Stage-sync Live Copilot
            </span>
            <span style={{ fontSize: 13, color: "var(--text-muted)" }}>PostgreSQL + pgvector • Redis • AI Engine</span>
          </div>
          <h1 style={{ fontSize: "28px", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
            {currentEvent?.name || "Event Control Room"}
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
            📍 {currentEvent?.venue || "Main Stage"} • 🗓️ {new Date(currentEvent?.date || Date.now()).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {currentEvent && (
            <Link href={`/live/${currentEvent.id}`} target="_blank" className="btn btn-primary" style={{ textDecoration: "none" }}>
              ⚡ Open Live Anchor HUD
            </Link>
          )}
          <button
            onClick={async () => {
              await seedDemoEvent();
              await loadAll();
            }}
            className="btn btn-secondary"
          >
            🔄 Reset Demo Data
          </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="tabs-nav">
        <button
          className={`tab-btn ${activeTab === "agenda" ? "active" : ""}`}
          onClick={() => setActiveTab("agenda")}
        >
          📋 Agenda & Schedule ({currentEvent?.agendaItems?.length || 0})
        </button>
        <button
          className={`tab-btn ${activeTab === "speakers" ? "active" : ""}`}
          onClick={() => setActiveTab("speakers")}
        >
          🎙️ Speakers & VIPs ({currentEvent?.speakers?.length || 0})
        </button>
        <button
          className={`tab-btn ${activeTab === "ai-studio" ? "active" : ""}`}
          onClick={() => setActiveTab("ai-studio")}
        >
          ✨ AI Script Copilot
        </button>
        <button
          className={`tab-btn ${activeTab === "live" ? "active" : ""}`}
          onClick={() => setActiveTab("live")}
        >
          🔴 Live Stage Dashboard
        </button>
        <button
          className={`tab-btn ${activeTab === "announcements" ? "active" : ""}`}
          onClick={() => setActiveTab("announcements")}
        >
          📣 Announcements & Delays
        </button>
      </nav>

      {/* TAB 1: AGENDA */}
      {activeTab === "agenda" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700 }}>Event Agenda Timeline</h2>
              <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>Manage activity schedules, active statuses, and dynamic delay ripple adjustments.</p>
            </div>
            <button className="btn btn-primary" onClick={() => setShowAddAgendaModal(true)}>
              + Add Agenda Item
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {currentEvent?.agendaItems?.map((item, idx) => {
              const itemTime = new Date(item.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
              return (
                <div
                  key={item.id}
                  className="card-box"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 16,
                    borderLeft: item.status === "LIVE" ? "4px solid #ef4444" : item.status === "COMPLETED" ? "4px solid #10b981" : "4px solid #6366f1"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 16, minWidth: 260 }}>
                    <div style={{ textAlign: "center", background: "var(--bg-card)", padding: "8px 14px", borderRadius: 8, minWidth: 80 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>{itemTime}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{item.durationMinutes} mins</div>
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 16, fontWeight: 700 }}>{item.title}</span>
                        <span className={`badge-tag ${
                          item.status === "LIVE" ? "badge-live" :
                          item.status === "COMPLETED" ? "badge-completed" :
                          item.status === "DELAYED" ? "badge-delayed" : "badge-upcoming"
                        }`}>
                          {item.status}
                        </span>
                      </div>
                      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 4 }}>{item.description || "No description provided."}</p>
                      {item.speaker && (
                        <div style={{ fontSize: 12, color: "#818cf8", fontWeight: 600 }}>
                          🎤 Speaker: {item.speaker.name} ({item.speaker.organization || item.speaker.designation || "Guest"})
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    {item.status !== "LIVE" && (
                      <button
                        className="btn btn-danger"
                        style={{ padding: "6px 12px", fontSize: 12 }}
                        onClick={() => handleUpdateStatus(item, "LIVE")}
                      >
                        Set Live
                      </button>
                    )}
                    {item.status === "LIVE" && (
                      <button
                        className="btn btn-primary"
                        style={{ padding: "6px 12px", fontSize: 12, background: "#10b981" }}
                        onClick={() => handleUpdateStatus(item, "COMPLETED")}
                      >
                        ✓ Mark Completed
                      </button>
                    )}

                    <div style={{ display: "flex", gap: 4 }}>
                      <button
                        className="btn btn-warning"
                        style={{ padding: "6px 10px", fontSize: 12 }}
                        title="Shift this and downstream items by +5 minutes"
                        onClick={() => handleApplyDelay(item.id, 5)}
                      >
                        +5m Delay
                      </button>
                      <button
                        className="btn btn-warning"
                        style={{ padding: "6px 10px", fontSize: 12 }}
                        title="Shift this and downstream items by +10 minutes"
                        onClick={() => handleApplyDelay(item.id, 10)}
                      >
                        +10m Delay
                      </button>
                    </div>

                    <button
                      className="btn btn-secondary"
                      style={{ padding: "6px 10px", fontSize: 12, color: "var(--accent-danger)" }}
                      onClick={() => handleDeleteItem(item.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add Agenda Modal */}
          {showAddAgendaModal && (
            <div style={{
              position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
              background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20
            }}>
              <div className="card-box" style={{ width: "100%", maxWidth: 520, background: "var(--bg-surface)" }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Add New Agenda Activity</h3>
                <form onSubmit={handleCreateAgenda} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>Title</label>
                    <input
                      style={{ width: "100%" }}
                      placeholder="e.g. AI Keynote Presentation"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>Description</label>
                    <textarea
                      style={{ width: "100%", minHeight: 70 }}
                      placeholder="Brief session description and instructions"
                      value={newDesc}
                      onChange={(e) => setNewDesc(e.target.value)}
                    />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>Start Time</label>
                      <input
                        type="time"
                        style={{ width: "100%" }}
                        value={newStartTime}
                        onChange={(e) => setNewStartTime(e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>Duration (Minutes)</label>
                      <input
                        type="number"
                        style={{ width: "100%" }}
                        value={newDuration}
                        onChange={(e) => setNewDuration(Number(e.target.value))}
                        min={1}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>Assign Speaker (Optional)</label>
                    <select
                      style={{ width: "100%" }}
                      value={newSpeakerId}
                      onChange={(e) => setNewSpeakerId(e.target.value)}
                    >
                      <option value="">-- None / Anchor Activity --</option>
                      {currentEvent?.speakers?.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.organization || s.designation || "Speaker"})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setShowAddAgendaModal(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">
                      Add to Schedule
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SPEAKERS */}
      {activeTab === "speakers" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700 }}>Speakers & VIP Guests</h2>
              <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>Manage keynote speakers, biographies, credentials, and generate custom anchor intro scripts.</p>
            </div>
            <button className="btn btn-primary" onClick={() => setShowAddSpeakerModal(true)}>
              + Add Speaker
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
            {currentEvent?.speakers?.map((sp) => (
              <div key={sp.id} className="card-box" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                    <div style={{
                      width: 46, height: 46, borderRadius: "50%",
                      background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontWeight: 700, fontSize: 18, color: "white"
                    }}>
                      {sp.name.charAt(0)}
                    </div>
                    <div>
                      <h3 style={{ fontSize: 16, fontWeight: 700 }}>{sp.name}</h3>
                      <p style={{ fontSize: 13, color: "#818cf8" }}>{sp.designation} {sp.organization ? `• ${sp.organization}` : ""}</p>
                    </div>
                  </div>
                  <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 14 }}>
                    {sp.biography || "No biography provided."}
                  </p>
                  {sp.expertise && sp.expertise.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
                      {sp.expertise.map((tag, i) => (
                        <span key={i} style={{ background: "var(--bg-card)", padding: "3px 8px", borderRadius: 4, fontSize: 11, color: "#94a3b8" }}>
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border-subtle)", paddingTop: 12 }}>
                  <button
                    className="btn btn-cyan"
                    style={{ padding: "6px 12px", fontSize: 12 }}
                    onClick={() => {
                      setSelectedSpeakerId(sp.id);
                      setScriptType("INTRODUCTION");
                      setActiveTab("ai-studio");
                    }}
                  >
                    ✨ Generate Intro Script
                  </button>
                  <button
                    className="btn btn-secondary"
                    style={{ padding: "6px 10px", fontSize: 12, color: "var(--accent-danger)" }}
                    onClick={() => handleDeleteSpeaker(sp.id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add Speaker Modal */}
          {showAddSpeakerModal && (
            <div style={{
              position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
              background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20
            }}>
              <div className="card-box" style={{ width: "100%", maxWidth: 520, background: "var(--bg-surface)" }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Add Speaker or VIP Guest</h3>
                <form onSubmit={handleAddSpeaker} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>Full Name</label>
                    <input
                      style={{ width: "100%" }}
                      placeholder="e.g. Dr. Jane Smith"
                      value={speakerName}
                      onChange={(e) => setSpeakerName(e.target.value)}
                      required
                    />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>Designation</label>
                      <input
                        style={{ width: "100%" }}
                        placeholder="e.g. Founder & CTO"
                        value={speakerRole}
                        onChange={(e) => setSpeakerRole(e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>Organization</label>
                      <input
                        style={{ width: "100%" }}
                        placeholder="e.g. OpenAI / Google"
                        value={speakerOrg}
                        onChange={(e) => setSpeakerOrg(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>Biography</label>
                    <textarea
                      style={{ width: "100%", minHeight: 70 }}
                      placeholder="Brief accomplishments, key patents, or background"
                      value={speakerBio}
                      onChange={(e) => setSpeakerBio(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>Expertise Tags (Comma separated)</label>
                    <input
                      style={{ width: "100%" }}
                      placeholder="AI, Cloud Architecture, Robotics"
                      value={speakerExpertise}
                      onChange={(e) => setSpeakerExpertise(e.target.value)}
                    />
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setShowAddSpeakerModal(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">
                      Save Speaker
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: AI SCRIPT STUDIO */}
      {activeTab === "ai-studio" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 24 }}>
          {/* Controls */}
          <div className="card-box">
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>AI Script Generator</h2>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>
              Generate teleprompter-ready stage speeches with phonetics and cue directions in seconds.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>
                  Script Category
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
                  {[
                    { id: "OPENING", label: "🎉 Opening Ceremony" },
                    { id: "INTRODUCTION", label: "🎤 Speaker Intro" },
                    { id: "TRANSITION", label: "🔄 Session Transition" },
                    { id: "CLOSING", label: "🏆 Closing & Vote of Thanks" },
                    { id: "DELAY_RECOVERY", label: "⏱️ Delay & Crowd Filler" },
                    { id: "ANNOUNCEMENT", label: "📢 Flash Announcement" },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setScriptType(cat.id)}
                      className={`btn ${scriptType === cat.id ? "btn-primary" : "btn-secondary"}`}
                      style={{ fontSize: 12, justifyContent: "flex-start", padding: "8px 12px" }}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>
                  Speech Tone
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  {["energetic", "formal", "warm", "humorous"].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setScriptTone(t)}
                      className={`btn ${scriptTone === t ? "btn-cyan" : "btn-secondary"}`}
                      style={{ textTransform: "capitalize", padding: "6px 12px", fontSize: 12 }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {scriptType === "INTRODUCTION" && (
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>
                    Select Speaker
                  </label>
                  <select
                    style={{ width: "100%" }}
                    value={selectedSpeakerId}
                    onChange={(e) => setSelectedSpeakerId(e.target.value)}
                  >
                    <option value="">-- Choose Speaker --</option>
                    {currentEvent?.speakers?.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.designation || s.organization || "Speaker"})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>
                  Custom Topic / Keywords (Optional)
                </label>
                <input
                  style={{ width: "100%" }}
                  placeholder="e.g. Next-gen Autonomous AI, Hackathon rules, WiFi login"
                  value={customTopic}
                  onChange={(e) => setCustomTopic(e.target.value)}
                />
              </div>

              <button
                className="btn btn-primary"
                style={{ marginTop: 8, padding: 12 }}
                onClick={handleGenerateScript}
                disabled={generating}
              >
                {generating ? "✨ Generating Teleprompter Script..." : "🚀 Generate Script with AI"}
              </button>
            </div>
          </div>

          {/* Script Output & Teleprompter Preview */}
          <div className="card-box" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
                  <span>📜 Teleprompter Cue Card</span>
                  {generatedScript && <span className="badge-tag badge-upcoming">Ready to Deliver</span>}
                </h3>
                {generatedScript && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: "4px 10px", fontSize: 12 }}
                      onClick={() => navigator.clipboard.writeText(generatedScript)}
                    >
                      📋 Copy Text
                    </button>
                    <button
                      className="btn btn-primary"
                      style={{ padding: "4px 12px", fontSize: 12 }}
                      onClick={handleSaveGeneratedScript}
                    >
                      {saveScriptSuccess ? "✓ Saved!" : "💾 Save to Event"}
                    </button>
                  </div>
                )}
              </div>

              {generatedScript ? (
                <div>
                  <div className="teleprompter-box" style={{ maxHeight: 380, overflowY: "auto" }}>
                    {generatedScript}
                  </div>

                  {stageDirections && stageDirections.length > 0 && (
                    <div style={{ marginTop: 14, background: "var(--bg-card)", padding: 12, borderRadius: 8 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#38bdf8", marginBottom: 6 }}>
                        💡 ANCHOR STAGE TIPS:
                      </div>
                      <ul style={{ paddingLeft: 18, fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                        {stageDirections.map((dir, i) => (
                          <li key={i}>{dir}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{
                  padding: "48px 24px", textAlign: "center", color: "var(--text-muted)",
                  border: "2px dashed var(--border-subtle)", borderRadius: 12
                }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🎙️</div>
                  <p style={{ fontWeight: 600 }}>No script generated yet.</p>
                  <p style={{ fontSize: 13 }}>Choose your category and tone on the left, then click Generate.</p>
                </div>
              )}
            </div>

            {currentEvent?.scripts && currentEvent.scripts.length > 0 && (
              <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 16, marginTop: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 8 }}>
                  Saved Event Scripts ({currentEvent.scripts.length})
                </div>
                <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
                  {currentEvent.scripts.slice(0, 5).map((s) => (
                    <button
                      key={s.id}
                      className="btn btn-secondary"
                      style={{ fontSize: 11, padding: "4px 8px", whiteSpace: "nowrap" }}
                      onClick={() => setGeneratedScript(s.content)}
                    >
                      [{s.type}] {s.content.substring(0, 20)}...
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: LIVE STAGE DASHBOARD */}
      {activeTab === "live" && (
        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 24 }}>
          {/* Active Activity & Cue Card */}
          <div className="card-box" style={{ border: "2px solid #ef4444" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="badge-tag badge-live">● NOW ON STAGE</span>
                <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Activity #{activeItemIndex + 1} of {currentEvent?.agendaItems?.length || 0}</span>
              </div>
              <div style={{ fontSize: 28, fontWeight: 900, fontFamily: "monospace", color: "#f87171" }}>
                ⏱️ {formatTimer(secondsRemaining)}
              </div>
            </div>

            <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8, color: "var(--text-primary)" }}>
              {currentItem?.title || "No Active Activity"}
            </h2>
            <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 16 }}>
              {currentItem?.description || "Scheduled stage activity"}
            </p>

            {currentItem?.speaker && (
              <div style={{ background: "var(--bg-card)", padding: 14, borderRadius: 10, marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#818cf8", marginBottom: 2 }}>KEYNOTE PRESENTER</div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{currentItem.speaker.name}</div>
                <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>{currentItem.speaker.designation} • {currentItem.speaker.organization}</div>
              </div>
            )}

            {/* Live Teleprompter Script */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 8 }}>
                ANCHOR PROMPTER NOTES:
              </div>
              <div className="teleprompter-box" style={{ fontSize: 16, padding: 18 }}>
                {currentEvent?.scripts?.find((s) => s.type === "OPENING" || s.type === "INTRODUCTION")?.content ||
                  `"Welcome our audience and present: ${currentItem?.title || "current session"}. Keep energy high and watch time boundaries."`}
              </div>
            </div>

            {/* Live Actions */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                className="btn btn-primary"
                style={{ background: "#10b981", flex: 1 }}
                onClick={async () => {
                  if (currentItem) {
                    await handleUpdateStatus(currentItem, "COMPLETED");
                  }
                  if (nextItem) {
                    await handleUpdateStatus(nextItem, "LIVE");
                    setActiveItemIndex((prev) => prev + 1);
                  }
                }}
              >
                ✓ Advance to Next Agenda Item
              </button>
              <button
                className="btn btn-warning"
                onClick={() => {
                  if (currentItem) handleApplyDelay(currentItem.id, 5);
                }}
              >
                +5m Emergency Delay
              </button>
            </div>
          </div>

          {/* Up Next & Quick Controls */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Next Item Card */}
            <div className="card-box">
              <div style={{ fontSize: 12, fontWeight: 700, color: "#818cf8", marginBottom: 6 }}>COMING UP NEXT</div>
              {nextItem ? (
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{nextItem.title}</h3>
                  <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 10 }}>{nextItem.description}</p>
                  <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                    Scheduled: {new Date(nextItem.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} • Duration: {nextItem.durationMinutes} mins
                  </div>
                  {nextItem.speaker && (
                    <div style={{ marginTop: 8, fontSize: 12, color: "#a5b4fc" }}>
                      🎤 Speaker: {nextItem.speaker.name}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ color: "var(--text-muted)", fontSize: 14 }}>
                  No more scheduled sessions. Event conclusion!
                </div>
              )}
            </div>

            {/* Stage Quick Flash */}
            <div className="card-box">
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>⚡ Flash Stage Cue</h3>
              <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 12 }}>
                Instantly trigger high-priority alerts to the anchor's full-screen HUD.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  "⏳ Wrap up within 2 minutes!",
                  "🎤 Check microphone audio levels",
                  "👥 Next speaker has arrived backstage",
                  "☕ Coffee break announced in foyer"
                ].map((msg, i) => (
                  <button
                    key={i}
                    className="btn btn-secondary"
                    style={{ justifyContent: "flex-start", fontSize: 12, padding: "8px 12px" }}
                    onClick={() => setActiveAlert(msg)}
                  >
                    {msg}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: ANNOUNCEMENTS & RECOVERY */}
      {activeTab === "announcements" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          {/* Delay Recovery Engine */}
          <div className="card-box">
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>🚨 AI Delay & Recovery Engine</h2>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>
              When sessions run late or technical glitches strike, generate immediate spoken scripts and engaging crowd fillers so the stage never stays awkward.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>
                  Estimated Delay (Minutes)
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  {[5, 10, 15, 20].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setDelayMinutes(m)}
                      className={`btn ${delayMinutes === m ? "btn-warning" : "btn-secondary"}`}
                      style={{ padding: "8px 14px" }}
                    >
                      +{m} mins
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>
                  Delay Reason / Backstage Context
                </label>
                <input
                  style={{ width: "100%" }}
                  value={delayReason}
                  onChange={(e) => setDelayReason(e.target.value)}
                  placeholder="e.g. Speaker flight delayed, AV projector sync, jury judging tally"
                />
              </div>

              <button
                className="btn btn-warning"
                onClick={handleGenerateDelayRecovery}
                disabled={recovering}
                style={{ marginTop: 6 }}
              >
                {recovering ? "Generating Recovery Plan..." : "🛠️ Generate AI Recovery Script & Crowd Fillers"}
              </button>

              {recoveryData && (
                <div style={{ marginTop: 14, background: "var(--bg-card)", padding: 16, borderRadius: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#fbbf24", marginBottom: 8 }}>
                    SPOKEN RECOVERY ANNOUNCEMENT:
                  </div>
                  <div style={{ fontSize: 14, lineHeight: 1.6, color: "#f8fafc", whiteSpace: "pre-wrap", marginBottom: 14 }}>
                    {recoveryData.anchorSpeech}
                  </div>

                  <div style={{ fontSize: 12, fontWeight: 700, color: "#60a5fa", marginBottom: 6 }}>
                    ENGAGING AUDIENCE FILLERS:
                  </div>
                  <ul style={{ paddingLeft: 18, fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                    {recoveryData.fillerActionItems?.map((item: string, idx: number) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Custom Broadcast */}
          <div className="card-box">
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>📢 Broadcast Urgent Announcement</h2>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>
              Push urgent text banners directly to the live stage view and teleprompter.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <textarea
                style={{ width: "100%", minHeight: 110 }}
                placeholder="Type urgent announcement here... (e.g. Lunch served in Hall B, Teams submit code on GitHub by 2:00 PM)"
                value={announcementMsg}
                onChange={(e) => setAnnouncementMsg(e.target.value)}
              />

              <button
                className="btn btn-primary"
                onClick={handleBroadcastAnnouncement}
                disabled={!announcementMsg.trim()}
              >
                🚀 Flash to Live Stage Prompter
              </button>

              <div style={{ marginTop: 16, borderTop: "1px solid var(--border-subtle)", paddingTop: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 8 }}>
                  RECENT SCHEDULE CHANGES ({currentEvent?.changes?.length || 0})
                </div>
                {currentEvent?.changes && currentEvent.changes.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {currentEvent.changes.slice(0, 4).map((ch) => (
                      <div key={ch.id} style={{ fontSize: 12, background: "var(--bg-card)", padding: "8px 12px", borderRadius: 6, color: "var(--text-secondary)" }}>
                        ⚠️ {ch.reason} <span style={{ color: "var(--text-muted)" }}>• {new Date(ch.createdAt).toLocaleTimeString()}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>No schedule changes recorded yet. Running on time!</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
