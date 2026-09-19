"use client";

import React from "react";
import { EventDetail } from "../../lib/api";

type Tab = "agenda" | "speakers" | "ai-studio" | "live" | "announcements";

interface TabNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  currentEvent: EventDetail | null;
}

export default function TabNav({ activeTab, onTabChange, currentEvent }: TabNavProps) {
  return (
    <nav className="tabs-nav">
      <button
        className={`tab-btn ${activeTab === "agenda" ? "active" : ""}`}
        onClick={() => onTabChange("agenda")}
      >
        Agenda &amp; Schedule ({currentEvent?.agendaItems?.length || 0})
      </button>
      <button
        className={`tab-btn ${activeTab === "speakers" ? "active" : ""}`}
        onClick={() => onTabChange("speakers")}
      >
        Speakers &amp; Guests ({currentEvent?.speakers?.length || 0})
      </button>
      <button
        className={`tab-btn ${activeTab === "ai-studio" ? "active" : ""}`}
        onClick={() => onTabChange("ai-studio")}
      >
        AI Script Studio
      </button>
      <button
        className={`tab-btn ${activeTab === "live" ? "active" : ""}`}
        onClick={() => onTabChange("live")}
      >
        Live Dashboard
      </button>
      <button
        className={`tab-btn ${activeTab === "announcements" ? "active" : ""}`}
        onClick={() => onTabChange("announcements")}
      >
        Delays &amp; Announcements
      </button>
    </nav>
  );
}
