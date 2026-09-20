'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { aiApi } from '../../lib/api';
import { useStageStore } from '../../store/useStageStore';
import { speakBroadcastScript, stopBroadcastSpeech } from '../../lib/speech';
import type { Script } from '../../lib/types';
import './ScriptModal.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  currentSpeaker?: string;
  nextSpeaker?: string;
  delayMinutes?: number;
  initialScript?: Script | null;
  scriptType?: 'TRANSITION' | 'ANNOUNCEMENT';
}

export function ScriptModal({
  isOpen,
  onClose,
  eventId,
  currentSpeaker = 'Current Speaker',
  nextSpeaker = 'Next Speaker',
  delayMinutes = 0,
  initialScript = null,
  scriptType = 'TRANSITION',
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scriptContent, setScriptContent] = useState<string>('');
  const [scriptId, setScriptId] = useState<string>('');
  const [isCached, setIsCached] = useState(false);
  const [isUsed, setIsUsed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [presenterMode, setPresenterMode] = useState(false);
  const [fontSize, setFontSize] = useState<number>(20); // px

  const addScript = useStageStore((s) => s.addScript);
  const markScriptUsed = useStageStore((s) => s.markScriptUsed);
  const logActivity = useStageStore((s) => s.logActivity);

  const lastFetchRef = useRef<number>(0);
  const modalRef = useRef<HTMLDivElement>(null);

  const stopSpeaking = useCallback(() => {
    stopBroadcastSpeech();
    setIsSpeaking(false);
  }, []);

  const generate = useCallback(async () => {
    const now = Date.now();
    // 1-second guard to avoid duplicate clicks
    if (now - lastFetchRef.current < 1_000) return;
    lastFetchRef.current = now;

    setLoading(true);
    setError(null);
    setCopied(false);
    stopSpeaking();

    try {
      const res = await aiApi.generateTransition({
        current: currentSpeaker,
        next: nextSpeaker,
        delayMinutes: delayMinutes > 0 ? delayMinutes : undefined,
      });

      const content =
        res.draft ||
        `Let's give another massive, warm round of applause for ${currentSpeaker}! We are so grateful for their exceptional wisdom and inspiring presence today. Next up, we are privileged to welcome ${nextSpeaker} to the stage—please join me in giving them an enthusiastic welcome!`;
      const newId = `scr-${Date.now()}`;
      setScriptContent(content);
      setScriptId(newId);
      setIsCached(Boolean(res.cached || res.fallback));
      setIsUsed(false);

      const scriptObj: Script = {
        id: newId,
        eventId,
        type: scriptType,
        content,
        aiGenerated: true,
        used: false,
        createdAt: new Date().toISOString(),
      };

      addScript(scriptObj);
      logActivity({
        label: `Generated ${scriptType.toLowerCase()} script`,
        type: 'script',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to generate script';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [currentSpeaker, nextSpeaker, delayMinutes, eventId, scriptType, addScript, logActivity, stopSpeaking]);

  useEffect(() => {
    if (!isOpen) {
      stopSpeaking();
      setPresenterMode(false);
      return;
    }

    if (initialScript) {
      setScriptContent(initialScript.content);
      setScriptId(initialScript.id);
      setIsUsed(Boolean(initialScript.used));
      setIsCached(false);
      setLoading(false);
      setError(null);
    } else {
      generate();
    }

    return () => {
      stopSpeaking();
    };
  }, [isOpen, initialScript, generate, stopSpeaking]);

  // Handle keyboard: Esc to close or exit presenter mode
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (presenterMode) {
          setPresenterMode(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, presenterMode, onClose]);

  const handleCopy = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(scriptContent);
      } else {
        const ta = document.createElement('textarea');
        ta.value = scriptContent;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2_000);
    } catch {
      // ignore
    }
  };

  const handleSpeakToggle = () => {
    if (isSpeaking) {
      stopSpeaking();
    } else {
      setIsSpeaking(true);
      speakBroadcastScript(
        scriptContent,
        () => setIsSpeaking(false),
        () => setIsSpeaking(false)
      );
    }
  };

  const handleMarkUsed = () => {
    if (scriptId) {
      markScriptUsed(scriptId);
      setIsUsed(true);
    }
  };

  if (!isOpen) return null;

  const lines = scriptContent ? scriptContent.split('\n').filter((l) => l.trim().length > 0) : [];

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className={`script-modal ${presenterMode ? 'script-modal--presenter' : ''}`}
        onClick={(e) => e.stopPropagation()}
        ref={modalRef}
      >
        {/* Header */}
        <div className="script-modal__header">
          <div className="script-modal__title-row">
            <h3 style={{ margin: 0, fontSize: 'var(--text-base)' }}>
              {scriptType === 'ANNOUNCEMENT' ? 'Stage Announcement' : 'MC Transition Teleprompter'}
            </h3>
            {isCached && (
              <span className="badge badge--delayed" title="Loaded from template fallback">
                ⚡ Using cached template
              </span>
            )}
            {isUsed && (
              <span className="badge badge--completed">
                ✓ Used
              </span>
            )}
          </div>

          <div className="script-modal__header-actions">
            {presenterMode && (
              <div className="presenter-controls">
                <button
                  className="presenter-btn"
                  onClick={() => setFontSize((s) => Math.max(16, s - 2))}
                  aria-label="Decrease font size"
                >
                  A−
                </button>
                <button
                  className="presenter-btn"
                  onClick={() => setFontSize((s) => Math.min(36, s + 2))}
                  aria-label="Increase font size"
                >
                  A+
                </button>
              </div>
            )}
            <button
              className="btn btn--ghost btn--sm"
              onClick={() => setPresenterMode((p) => !p)}
              title="Toggle Fullscreen Teleprompter"
            >
              {presenterMode ? 'Exit Fullscreen' : 'Presenter Mode'}
            </button>
            <button
              className="btn btn--ghost btn--sm"
              onClick={onClose}
              aria-label="Close modal"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="script-modal__body">
          {loading ? (
            <div className="script-modal__skeleton">
              <div className="script-modal__skeleton-line skeleton" style={{ width: '85%' }} />
              <div className="script-modal__skeleton-line skeleton" style={{ width: '95%' }} />
              <div className="script-modal__skeleton-line skeleton" style={{ width: '70%' }} />
              <div className="script-modal__skeleton-line skeleton" style={{ width: '90%' }} />
            </div>
          ) : error ? (
            <div className="script-modal__error">
              <div className="script-modal__error-msg">{error}</div>
              <button className="btn btn--primary btn--sm" onClick={generate}>
                Retry Generation
              </button>
            </div>
          ) : (
            <div
              className="script-modal__content"
              style={{ fontSize: `${fontSize}px` }}
            >
              {lines.map((line, idx) => (
                <span
                  key={idx}
                  className="script-modal__line"
                  style={{ animationDelay: `${Math.min(idx * 35, 300)}ms` }}
                >
                  {line}
                  <br /><br />
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {!presenterMode && !loading && !error && (
          <div className="script-modal__footer">
            <div className="script-modal__footer-left">
              <button className="btn btn--ghost btn--sm" onClick={handleCopy}>
                {copied ? 'Copied ✓' : 'Copy Script'}
              </button>
              {'speechSynthesis' in (typeof window !== 'undefined' ? window : {}) && (
                <button className="btn btn--ghost btn--sm" onClick={handleSpeakToggle}>
                  {isSpeaking ? '⏹ Stop Audio' : '🔊 Read Aloud'}
                </button>
              )}
            </div>

            <div className="script-modal__footer-right">
              {!isUsed && (
                <button className="btn btn--ghost btn--sm" onClick={handleMarkUsed}>
                  Mark as Used
                </button>
              )}
              <button className="btn btn--primary btn--sm" onClick={onClose}>
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
