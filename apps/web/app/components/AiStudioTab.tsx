"use client";

import React from "react";
import { EventDetail } from "../../lib/api";

interface AiStudioTabProps {
  currentEvent: EventDetail | null;
  scriptType: string;
  setScriptType: (v: string) => void;
  scriptTone: string;
  setScriptTone: (v: string) => void;
  selectedSpeakerId: string;
  setSelectedSpeakerId: (v: string) => void;
  customTopic: string;
  setCustomTopic: (v: string) => void;
  generatedScript: string;
  setGeneratedScript: (v: string) => void;
  stageDirections: string[];
  generating: boolean;
  saveScriptSuccess: boolean;
  onGenerateScript: () => void;
  onSaveScript: () => void;
}

export default function AiStudioTab({
  currentEvent,
  scriptType,
  setScriptType,
  scriptTone,
  setScriptTone,
  selectedSpeakerId,
  setSelectedSpeakerId,
  customTopic,
  setCustomTopic,
  generatedScript,
  setGeneratedScript,
  stageDirections,
  generating,
  saveScriptSuccess,
  onGenerateScript,
  onSaveScript,
}: AiStudioTabProps) {
  return (
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
            onClick={onGenerateScript}
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
                  onClick={onSaveScript}
                >
                  {saveScriptSuccess ? "? Saved" : "Save to Event"}
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
                    ANCHOR CUES &amp; DIRECTIONS:
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
  );
}
