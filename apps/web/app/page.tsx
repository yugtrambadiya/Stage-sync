"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  EventDetail,
  AgendaItem,
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
  const [delayReason, setDelayReason] = useState("Audio-visual calibration");
  const [recoveryData, setRecoveryData] = useState<any>(null);
  const [recovering, setRecovering] = useState(false);

  // Flash Announcement state
  const [announcementMsg, setAnnouncementMsg] = useState("");
  const [activeAlert, setActiveAlert] = useState<string | null>(null);

  // Live timer state
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

  useEffect(() => {
    if (currentEvent?.agendaItems && currentEvent.agendaItems.length > 0) {
      const liveIdx = currentEvent.agendaItems.findIndex((i) => i.status === "LIVE");
      if (liveIdx !== -1) {
        setActiveItemIndex(liveIdx);
        setSecondsRemaining(currentEvent.agendaItems[liveIdx].durationMinutes * 60);
      }
    }
  }, [currentEvent]);

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
    setActiveAlert(`Schedule shifted +${mins} minutes for subsequent sessions.`);
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
        eventType: "College Event & Summit",
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

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const currentItem = currentEvent?.agendaItems[activeItemIndex];
  const nextItem = currentEvent?.agendaItems[activeItemIndex + 1];

  if (loading) {
    return (
      <div className="app-container" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "70vh" }}>
        <div style={{ textAlign: "center", color: "var(--text-secondary)" }}>
          <div className="status-dot" style={{ width: 14, height: 14, margin: "0 auto 12px" }}></div>
          <p style={{ fontSize: 14 }}>Loading Stage-sync...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Alert Banner */}
      {activeAlert && (
        <div style={{
          background: "#fef3c7",
          border: "1px solid #fde68a",
          color: "#92400e",
          padding: "10px 16px",
          borderRadius: 8,
          marginBottom: 20,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 13,
          fontWeight: 600
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span>📢 Stage Alert:</span>
            <span>{activeAlert}</span>
          </div>
          <button onClick={() => setActiveAlert(null)} style={{ color: "#92400e", fontWeight: 700, padding: "2px 6px" }}>✕</button>
        </div>
      )}

      {/* Top Header */}
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
            📍 {currentEvent?.venue || "Main Auditorium"} • 🗓️ {new Date(currentEvent?.date || Date.now()).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {currentEvent && (
            <Link href={`/live/${currentEvent.id}`} target="_blank" className="btn btn-primary" style={{ textDecoration: "none" }}>
              Launch Anchor HUD →
            </Link>
          )}
          <button
            onClick={async () => {
              await seedDemoEvent();
              await loadAll();
            }}
            className="btn btn-secondary"
          >
            Reset Demo Data
          </button>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="tabs-nav">
        <button
          className={`tab-btn ${activeTab === "agenda" ? "active" : ""}`}
          onClick={() => setActiveTab("agenda")}
        >
          Agenda & Schedule ({currentEvent?.agendaItems?.length || 0})
        </button>
        <button
          className={`tab-btn ${activeTab === "speakers" ? "active" : ""}`}
          onClick={() => setActiveTab("speakers")}
        >
          Speakers & Guests ({currentEvent?.speakers?.length || 0})
        </button>
        <button
          className={`tab-btn ${activeTab === "ai-studio" ? "active" : ""}`}
          onClick={() => setActiveTab("ai-studio")}
        >
          AI Script Studio
        </button>
        <button
          className={`tab-btn ${activeTab === "live" ? "active" : ""}`}
          onClick={() => setActiveTab("live")}
        >
          Live Dashboard
        </button>
        <button
          className={`tab-btn ${activeTab === "announcements" ? "active" : ""}`}
          onClick={() => setActiveTab("announcements")}
        >
          Delays & Announcements
        </button>
      </nav>

      {/* TAB 1: AGENDA */}
      {activeTab === "agenda" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 700 }}>Event Schedule</h2>
              <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>Review and manage activity order, timings, and delay shifts.</p>
            </div>
            <button className="btn btn-primary" onClick={() => setShowAddAgendaModal(true)}>
              + Add Activity
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {currentEvent?.agendaItems?.map((item) => {
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
                    gap: 14,
                    borderLeft: item.status === "LIVE" ? "4px solid #dc2626" : item.status === "COMPLETED" ? "4px solid #059669" : "4px solid #e2e8f0"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                    <div style={{ textAlign: "center", background: "#f1f5f9", padding: "6px 12px", borderRadius: 6, minWidth: 72 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{itemTime}</div>
                      <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>{item.durationMinutes}m</div>
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                        <span style={{ fontSize: 15, fontWeight: 700 }}>{item.title}</span>
                        <span className={`badge-tag ${
                          item.status === "LIVE" ? "badge-live" :
                          item.status === "COMPLETED" ? "badge-completed" :
                          item.status === "DELAYED" ? "badge-delayed" : "badge-upcoming"
                        }`}>
                          {item.status}
                        </span>
                      </div>
                      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 4 }}>
                        {item.description || "No notes provided."}
                      </p>
                      {item.speaker && (
                        <div style={{ fontSize: 12, color: "#2563eb", fontWeight: 600 }}>
                          🎤 {item.speaker.name} ({item.speaker.organization || item.speaker.designation || "Guest"})
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {item.status !== "LIVE" && (
                      <button
                        className="btn btn-danger"
                        style={{ padding: "5px 10px", fontSize: 12 }}
                        onClick={() => handleUpdateStatus(item, "LIVE")}
                      >
                        Set Live
                      </button>
                    )}
                    {item.status === "LIVE" && (
                      <button
                        className="btn btn-primary"
                        style={{ padding: "5px 10px", fontSize: 12, background: "#059669" }}
                        onClick={() => handleUpdateStatus(item, "COMPLETED")}
                      >
                        ✓ Completed
                      </button>
                    )}

                    <button
                      className="btn btn-warning"
                      style={{ padding: "5px 10px", fontSize: 12 }}
                      title="Shift this and downstream items by +5 minutes"
                      onClick={() => handleApplyDelay(item.id, 5)}
                    >
                      +5m
                    </button>
                    <button
                      className="btn btn-warning"
                      style={{ padding: "5px 10px", fontSize: 12 }}
                      title="Shift this and downstream items by +10 minutes"
                      onClick={() => handleApplyDelay(item.id, 10)}
                    >
                      +10m
                    </button>

                    <button
                      className="btn btn-secondary"
                      style={{ padding: "5px 8px", fontSize: 12, color: "#dc2626" }}
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
              background: "rgba(15, 23, 42, 0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20
            }}>
              <div className="card-box" style={{ width: "100%", maxWidth: 480 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>Add Agenda Activity</h3>
                <form onSubmit={handleCreateAgenda} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>Title</label>
                    <input
                      style={{ width: "100%" }}
                      placeholder="e.g. Keynote Address"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>Description</label>
                    <textarea
                      style={{ width: "100%", minHeight: 60 }}
                      placeholder="Brief session details"
                      value={newDesc}
                      onChange={(e) => setNewDesc(e.target.value)}
                    />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
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
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>Speaker (Optional)</label>
                    <select
                      style={{ width: "100%" }}
                      value={newSpeakerId}
                      onChange={(e) => setNewSpeakerId(e.target.value)}
                    >
                      <option value="">-- Anchor / General Activity --</option>
                      {currentEvent?.speakers?.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.organization || s.designation || "Speaker"})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setShowAddAgendaModal(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">
                      Save Activity
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 700 }}>Speaker & Guest Directory</h2>
              <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>Manage bios, affiliations, and generate introductions.</p>
            </div>
            <button className="btn btn-primary" onClick={() => setShowAddSpeakerModal(true)}>
              + Add Speaker
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
            {currentEvent?.speakers?.map((sp) => (
              <div key={sp.id} className="card-box" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: "50%",
                      background: "#eff6ff", color: "#1d4ed8",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontWeight: 700, fontSize: 16, border: "1px solid #dbeafe"
                    }}>
                      {sp.name.charAt(0)}
                    </div>
                    <div>
                      <h3 style={{ fontSize: 15, fontWeight: 700 }}>{sp.name}</h3>
                      <p style={{ fontSize: 12, color: "#2563eb" }}>{sp.designation} {sp.organization ? `• ${sp.organization}` : ""}</p>
                    </div>
                  </div>
                  <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: 12 }}>
                    {sp.biography || "No bio provided."}
                  </p>
                  {sp.expertise && sp.expertise.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 14 }}>
                      {sp.expertise.map((tag, i) => (
                        <span key={i} style={{ background: "#f1f5f9", border: "1px solid #e2e8f0", padding: "2px 6px", borderRadius: 4, fontSize: 11, color: "var(--text-secondary)" }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border-subtle)", paddingTop: 10 }}>
                  <button
                    className="btn btn-sky"
                    style={{ padding: "5px 10px", fontSize: 12 }}
                    onClick={() => {
                      setSelectedSpeakerId(sp.id);
                      setScriptType("INTRODUCTION");
                      setActiveTab("ai-studio");
                    }}
                  >
                    Generate Intro Script
                  </button>
                  <button
                    className="btn btn-secondary"
                    style={{ padding: "5px 8px", fontSize: 12, color: "#dc2626" }}
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
              background: "rgba(15, 23, 42, 0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20
            }}>
              <div className="card-box" style={{ width: "100%", maxWidth: 480 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>Add New Speaker</h3>
                <form onSubmit={handleAddSpeaker} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>Name</label>
                    <input
                      style={{ width: "100%" }}
                      placeholder="e.g. Dr. Aisha Sharma"
                      value={speakerName}
                      onChange={(e) => setSpeakerName(e.target.value)}
                      required
                    />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>Designation</label>
                      <input
                        style={{ width: "100%" }}
                        placeholder="e.g. Chief AI Scientist"
                        value={speakerRole}
                        onChange={(e) => setSpeakerRole(e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>Organization</label>
                      <input
                        style={{ width: "100%" }}
                        placeholder="e.g. NovaLabs"
                        value={speakerOrg}
                        onChange={(e) => setSpeakerOrg(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>Biography</label>
                    <textarea
                      style={{ width: "100%", minHeight: 60 }}
                      placeholder="Brief background and accomplishments"
                      value={speakerBio}
                      onChange={(e) => setSpeakerBio(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>Expertise (Comma separated)</label>
                    <input
                      style={{ width: "100%" }}
                      placeholder="AI, Cloud Architecture"
                      value={speakerExpertise}
                      onChange={(e) => setSpeakerExpertise(e.target.value)}
                    />
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
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
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: 20 }}>
          {/* Controls */}
          <div className="card-box">
            <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>AI Script Generator</h2>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>
              Craft contextual, spoken-word stage scripts tailored to the occasion.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>
                  Script Type
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6 }}>
                  {[
                    { id: "OPENING", label: "Opening Ceremony" },
                    { id: "INTRODUCTION", label: "Speaker Intro" },
                    { id: "TRANSITION", label: "Session Transition" },
                    { id: "CLOSING", label: "Vote of Thanks" },
                    { id: "DELAY_RECOVERY", label: "Delay / Crowd Filler" },
                    { id: "ANNOUNCEMENT", label: "Announcement" },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setScriptType(cat.id)}
                      className={`btn ${scriptType === cat.id ? "btn-primary" : "btn-secondary"}`}
                      style={{ fontSize: 12, justifyContent: "flex-start", padding: "7px 10px" }}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>
                  Tone
                </label>
                <div style={{ display: "flex", gap: 6 }}>
                  {["energetic", "formal", "warm", "humorous"].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setScriptTone(t)}
                      className={`btn ${scriptTone === t ? "btn-sky" : "btn-secondary"}`}
                      style={{ textTransform: "capitalize", padding: "5px 10px", fontSize: 12 }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {scriptType === "INTRODUCTION" && (
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>
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
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>
                  Topic or Keynotes
                </label>
                <input
                  style={{ width: "100%" }}
                  placeholder="e.g. Next-generation AI, Hackathon challenge reveal"
                  value={customTopic}
                  onChange={(e) => setCustomTopic(e.target.value)}
                />
              </div>

              <button
                className="btn btn-primary"
                style={{ marginTop: 4, padding: "10px" }}
                onClick={handleGenerateScript}
                disabled={generating}
              >
                {generating ? "Generating Script..." : "Generate Script"}
              </button>
            </div>
          </div>

          {/* Script Output */}
          <div className="card-box" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700 }}>Teleprompter Script Preview</h3>
                {generatedScript && (
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: "4px 8px", fontSize: 12 }}
                      onClick={() => navigator.clipboard.writeText(generatedScript)}
                    >
                      Copy
                    </button>
                    <button
                      className="btn btn-primary"
                      style={{ padding: "4px 10px", fontSize: 12 }}
                      onClick={handleSaveGeneratedScript}
                    >
                      {saveScriptSuccess ? "✓ Saved" : "Save to Event"}
                    </button>
                  </div>
                )}
              </div>

              {generatedScript ? (
                <div>
                  <div className="teleprompter-box" style={{ maxHeight: 360, overflowY: "auto" }}>
                    {generatedScript}
                  </div>

                  {stageDirections && stageDirections.length > 0 && (
                    <div style={{ marginTop: 12, background: "#f8fafc", border: "1px solid var(--border-subtle)", padding: 12, borderRadius: 6 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#0369a1", marginBottom: 4 }}>
                        ANCHOR CUES & DIRECTIONS:
                      </div>
                      <ul style={{ paddingLeft: 16, fontSize: 13, color: "var(--text-secondary)" }}>
                        {stageDirections.map((dir, i) => (
                          <li key={i}>{dir}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{
                  padding: "40px 20px", textAlign: "center", color: "var(--text-muted)",
                  border: "1px dashed var(--border-subtle)", borderRadius: 8
                }}>
                  <p style={{ fontWeight: 600, fontSize: 14 }}>No script generated yet.</p>
                  <p style={{ fontSize: 12 }}>Configure your options on the left and click Generate.</p>
                </div>
              )}
            </div>

            {currentEvent?.scripts && currentEvent.scripts.length > 0 && (
              <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 14, marginTop: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 6 }}>
                  Saved Scripts ({currentEvent.scripts.length})
                </div>
                <div style={{ display: "flex", gap: 6, overflowX: "auto" }}>
                  {currentEvent.scripts.slice(0, 5).map((s) => (
                    <button
                      key={s.id}
                      className="btn btn-secondary"
                      style={{ fontSize: 11, padding: "4px 8px", whiteSpace: "nowrap" }}
                      onClick={() => setGeneratedScript(s.content)}
                    >
                      [{s.type}] {s.content.substring(0, 24)}...
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
                ⏱️ {formatTimer(secondsRemaining)}
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
                onClick={async () => {
                  if (currentItem) await handleUpdateStatus(currentItem, "COMPLETED");
                  if (nextItem) {
                    await handleUpdateStatus(nextItem, "LIVE");
                    setActiveItemIndex((i) => i + 1);
                  }
                }}
              >
                Advance to Next Item →
              </button>
              <button
                className="btn btn-warning"
                onClick={() => {
                  if (currentItem) handleApplyDelay(currentItem.id, 5);
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
                      🎤 Speaker: {nextItem.speaker.name}
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
                  "⏳ Wrap up in 2 minutes",
                  "🎤 Check microphone audio levels",
                  "👥 Speaker has arrived backstage",
                  "☕ Refreshments ready in foyer"
                ].map((msg, i) => (
                  <button
                    key={i}
                    className="btn btn-secondary"
                    style={{ justifyContent: "flex-start", fontSize: 12, padding: "6px 10px" }}
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

      {/* TAB 5: DELAYS & ANNOUNCEMENTS */}
      {activeTab === "announcements" && (
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
                onClick={handleGenerateDelayRecovery}
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
                onClick={() => {
                  if (!announcementMsg.trim()) return;
                  setActiveAlert(announcementMsg);
                  setAnnouncementMsg("");
                }}
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
                        ⚠️ {ch.reason} <span style={{ color: "var(--text-muted)" }}>• {new Date(ch.createdAt).toLocaleTimeString()}</span>
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
      )}
    </div>
  );
}
