"use client";

import React, { useEffect, useState } from "react";
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

import AlertBanner from "./components/AlertBanner";
import TopHeader from "./components/TopHeader";
import TabNav from "./components/TabNav";
import AgendaTab from "./components/AgendaTab";
import SpeakersTab from "./components/SpeakersTab";
import AiStudioTab from "./components/AiStudioTab";
import LiveTab from "./components/LiveTab";
import AnnouncementsTab from "./components/AnnouncementsTab";

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

  const currentItem = currentEvent?.agendaItems?.[activeItemIndex];
  const nextItem = currentEvent?.agendaItems?.[activeItemIndex + 1];

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
      <AlertBanner activeAlert={activeAlert} onDismiss={() => setActiveAlert(null)} />

      <TopHeader
        currentEvent={currentEvent}
        onResetDemo={async () => {
          await seedDemoEvent();
          await loadAll();
        }}
      />

      <TabNav activeTab={activeTab} onTabChange={setActiveTab} currentEvent={currentEvent} />

      {activeTab === "agenda" && (
        <AgendaTab
          currentEvent={currentEvent}
          showAddAgendaModal={showAddAgendaModal}
          setShowAddAgendaModal={setShowAddAgendaModal}
          newTitle={newTitle}
          setNewTitle={setNewTitle}
          newDesc={newDesc}
          setNewDesc={setNewDesc}
          newDuration={newDuration}
          setNewDuration={setNewDuration}
          newStartTime={newStartTime}
          setNewStartTime={setNewStartTime}
          newSpeakerId={newSpeakerId}
          setNewSpeakerId={setNewSpeakerId}
          onCreateAgenda={handleCreateAgenda}
          onUpdateStatus={handleUpdateStatus}
          onApplyDelay={handleApplyDelay}
          onDeleteItem={handleDeleteItem}
        />
      )}

      {activeTab === "speakers" && (
        <SpeakersTab
          currentEvent={currentEvent}
          showAddSpeakerModal={showAddSpeakerModal}
          setShowAddSpeakerModal={setShowAddSpeakerModal}
          speakerName={speakerName}
          setSpeakerName={setSpeakerName}
          speakerRole={speakerRole}
          setSpeakerRole={setSpeakerRole}
          speakerOrg={speakerOrg}
          setSpeakerOrg={setSpeakerOrg}
          speakerBio={speakerBio}
          setSpeakerBio={setSpeakerBio}
          speakerExpertise={speakerExpertise}
          setSpeakerExpertise={setSpeakerExpertise}
          onAddSpeaker={handleAddSpeaker}
          onDeleteSpeaker={handleDeleteSpeaker}
          onGenerateIntro={(spId) => {
            setSelectedSpeakerId(spId);
            setScriptType("INTRODUCTION");
            setActiveTab("ai-studio");
          }}
        />
      )}

      {activeTab === "ai-studio" && (
        <AiStudioTab
          currentEvent={currentEvent}
          scriptType={scriptType}
          setScriptType={setScriptType}
          scriptTone={scriptTone}
          setScriptTone={setScriptTone}
          selectedSpeakerId={selectedSpeakerId}
          setSelectedSpeakerId={setSelectedSpeakerId}
          customTopic={customTopic}
          setCustomTopic={setCustomTopic}
          generatedScript={generatedScript}
          setGeneratedScript={setGeneratedScript}
          stageDirections={stageDirections}
          generating={generating}
          saveScriptSuccess={saveScriptSuccess}
          onGenerateScript={handleGenerateScript}
          onSaveScript={handleSaveGeneratedScript}
        />
      )}

      {activeTab === "live" && (
        <LiveTab
          currentEvent={currentEvent}
          activeItemIndex={activeItemIndex}
          secondsRemaining={secondsRemaining}
          currentItem={currentItem}
          nextItem={nextItem}
          formatTimer={formatTimer}
          onUpdateStatus={handleUpdateStatus}
          onApplyDelay={handleApplyDelay}
          onAdvanceItem={async () => {
            if (currentItem) await handleUpdateStatus(currentItem, "COMPLETED");
            if (nextItem) {
              await handleUpdateStatus(nextItem, "LIVE");
              setActiveItemIndex((i) => i + 1);
            }
          }}
          onSetAlert={setActiveAlert}
        />
      )}

      {activeTab === "announcements" && (
        <AnnouncementsTab
          currentEvent={currentEvent}
          delayMinutes={delayMinutes}
          setDelayMinutes={setDelayMinutes}
          delayReason={delayReason}
          setDelayReason={setDelayReason}
          recoveryData={recoveryData}
          recovering={recovering}
          announcementMsg={announcementMsg}
          setAnnouncementMsg={setAnnouncementMsg}
          onGenerateDelayRecovery={handleGenerateDelayRecovery}
          onBroadcastAnnouncement={() => {
            if (!announcementMsg.trim()) return;
            setActiveAlert(announcementMsg);
            setAnnouncementMsg("");
          }}
        />
      )}
    </div>
  );
}
