"use client";

import React from "react";
import { EventDetail } from "../../lib/api";

interface SpeakersTabProps {
  currentEvent: EventDetail | null;
  showAddSpeakerModal: boolean;
  setShowAddSpeakerModal: (v: boolean) => void;
  speakerName: string;
  setSpeakerName: (v: string) => void;
  speakerRole: string;
  setSpeakerRole: (v: string) => void;
  speakerOrg: string;
  setSpeakerOrg: (v: string) => void;
  speakerBio: string;
  setSpeakerBio: (v: string) => void;
  speakerExpertise: string;
  setSpeakerExpertise: (v: string) => void;
  onAddSpeaker: (e: React.FormEvent) => void;
  onDeleteSpeaker: (spId: string) => void;
  onGenerateIntro: (spId: string) => void;
}

export default function SpeakersTab({
  currentEvent,
  showAddSpeakerModal,
  setShowAddSpeakerModal,
  speakerName,
  setSpeakerName,
  speakerRole,
  setSpeakerRole,
  speakerOrg,
  setSpeakerOrg,
  speakerBio,
  setSpeakerBio,
  speakerExpertise,
  setSpeakerExpertise,
  onAddSpeaker,
  onDeleteSpeaker,
  onGenerateIntro,
}: SpeakersTabProps) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 17, fontWeight: 700 }}>Speaker &amp; Guest Directory</h2>
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
                  <p style={{ fontSize: 12, color: "#2563eb" }}>{sp.designation} {sp.organization ? `- ${sp.organization}` : ""}</p>
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
                onClick={() => onGenerateIntro(sp.id)}
              >
                Generate Intro Script
              </button>
              <button
                className="btn btn-secondary"
                style={{ padding: "5px 8px", fontSize: 12, color: "#dc2626" }}
                onClick={() => onDeleteSpeaker(sp.id)}
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
            <form onSubmit={onAddSpeaker} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
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
  );
}