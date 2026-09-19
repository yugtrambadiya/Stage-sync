"use client";

import React from "react";
import { EventDetail, AgendaItem } from "../../lib/api";

interface AgendaTabProps {
  currentEvent: EventDetail | null;
  showAddAgendaModal: boolean;
  setShowAddAgendaModal: (v: boolean) => void;
  newTitle: string;
  setNewTitle: (v: string) => void;
  newDesc: string;
  setNewDesc: (v: string) => void;
  newDuration: number;
  setNewDuration: (v: number) => void;
  newStartTime: string;
  setNewStartTime: (v: string) => void;
  newSpeakerId: string;
  setNewSpeakerId: (v: string) => void;
  onCreateAgenda: (e: React.FormEvent) => void;
  onUpdateStatus: (item: AgendaItem, status: any) => void;
  onApplyDelay: (itemId: string, mins: number) => void;
  onDeleteItem: (itemId: string) => void;
}

export default function AgendaTab({
  currentEvent,
  showAddAgendaModal,
  setShowAddAgendaModal,
  newTitle,
  setNewTitle,
  newDesc,
  setNewDesc,
  newDuration,
  setNewDuration,
  newStartTime,
  setNewStartTime,
  newSpeakerId,
  setNewSpeakerId,
  onCreateAgenda,
  onUpdateStatus,
  onApplyDelay,
  onDeleteItem,
}: AgendaTabProps) {
  return (
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
                      ?? {item.speaker.name} ({item.speaker.organization || item.speaker.designation || "Guest"})
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
                    onClick={() => onUpdateStatus(item, "LIVE")}
                  >
                    Set Live
                  </button>
                )}
                {item.status === "LIVE" && (
                  <button
                    className="btn btn-primary"
                    style={{ padding: "5px 10px", fontSize: 12, background: "#059669" }}
                    onClick={() => onUpdateStatus(item, "COMPLETED")}
                  >
                    ? Completed
                  </button>
                )}

                <button
                  className="btn btn-warning"
                  style={{ padding: "5px 10px", fontSize: 12 }}
                  title="Shift this and downstream items by +5 minutes"
                  onClick={() => onApplyDelay(item.id, 5)}
                >
                  +5m
                </button>
                <button
                  className="btn btn-warning"
                  style={{ padding: "5px 10px", fontSize: 12 }}
                  title="Shift this and downstream items by +10 minutes"
                  onClick={() => onApplyDelay(item.id, 10)}
                >
                  +10m
                </button>

                <button
                  className="btn btn-secondary"
                  style={{ padding: "5px 8px", fontSize: 12, color: "#dc2626" }}
                  onClick={() => onDeleteItem(item.id)}
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
            <form onSubmit={onCreateAgenda} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
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
  );
}
