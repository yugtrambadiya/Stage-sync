'use client';

import { useState, useEffect, useRef } from 'react';
import { agendaApi, ApiRequestError } from '../../lib/api';
import { useStageStore } from '../../store/useStageStore';
import type { AgendaItem, CascadeResult } from '../../lib/types';
import './DelayModal.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  item: AgendaItem | null;
  onGenerateAnnouncement?: (delayMinutes: number) => void;
  onGenerateScript?: (delayMinutes: number) => void;
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return '--:--';
  }
}

export function DelayModal({
  isOpen,
  onClose,
  item,
  onGenerateAnnouncement,
  onGenerateScript,
}: Props) {
  const [minutes, setMinutes] = useState<number>(15);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CascadeResult | null>(null);

  const setLastDiff = useStageStore((s) => s.setLastDiff);
  const logActivity = useStageStore((s) => s.logActivity);
  const pushAnnouncement = useStageStore((s) => s.pushAnnouncement);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setMinutes(15);
      setError(null);
      setResult(null);
      setTimeout(() => inputRef.current?.select(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!item) return;

    setLoading(true);
    setError(null);

    try {
      const res = await agendaApi.applyDelay(
        item.id,
        {
          delayMinutes: minutes,
          cascade: true,
          reason: `Delay reported from Stage Control: +${minutes}m`,
        },
        `delay-${Date.now()}`,
      );

      setResult(res);

      setLastDiff({
        batchId: res.batchId,
        delayMinutes: res.delayMinutes,
        changes: res.changes,
        impact: res.impact,
        appliedAt: new Date().toISOString(),
      });

      logActivity({
        label: `Applied +${minutes}m delay to "${item.title}" (${res.impact.affectedCount} items shifted)`,
        type: 'delay',
      });

      pushAnnouncement({
        severity: 'warn',
        title: 'Schedule Updated',
        message: `Applied ${minutes} min delay · ${res.impact.affectedCount} sessions shifted`,
      });
    } catch (err: unknown) {
      if (err instanceof ApiRequestError) {
        setError(err.body.message || 'Failed to apply schedule delay');
      } else {
        setError((err as Error).message || 'Failed to apply schedule delay');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !item) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="delay-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="delay-modal__header">
          <h3 className="delay-modal__title">
            {result ? 'Schedule Updated' : 'Mark Stage Delay'}
          </h3>
          <button className="btn btn--ghost btn--sm" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="delay-modal__body">
          {/* Target session info */}
          <div className="delay-modal__item-info">
            <div className="delay-modal__item-title">{item.title}</div>
            <div className="delay-modal__item-speaker">
              {item.speaker?.name ?? 'Speaker'} · Scheduled: {formatTime(item.startTime)} ({item.durationMinutes}m)
            </div>
          </div>

          {!result ? (
            <form onSubmit={handleSubmit} className="delay-modal__field">
              <label className="label" htmlFor="delay-minutes-input">
                Delay Duration (Minutes)
              </label>

              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <input
                  id="delay-minutes-input"
                  ref={inputRef}
                  className="input num"
                  type="number"
                  min={1}
                  max={120}
                  value={minutes}
                  onChange={(e) => setMinutes(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  disabled={loading}
                  style={{ width: '100px' }}
                />

                {/* Quick Presets */}
                <div className="delay-modal__presets">
                  {[5, 10, 15, 30].map((p) => (
                    <button
                      key={p}
                      type="button"
                      className={`delay-modal__preset-btn ${minutes === p ? 'delay-modal__preset-btn--active' : ''}`}
                      onClick={() => setMinutes(p)}
                    >
                      +{p}m
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="field-error" style={{ color: 'var(--color-danger)', fontSize: 'var(--text-xs)', marginTop: 4 }}>
                  {error}
                </div>
              )}
            </form>
          ) : (
            /* Result state with Inline Diff */
            <div className="delay-modal__diff">
              <div className="delay-modal__diff-header">
                <span>Cascade Applied · {result.impact.affectedCount} items shifted</span>
                <span className="num">+{result.delayMinutes} min</span>
              </div>

              <div className="delay-modal__diff-list">
                {result.changes.map((change) => (
                  <div key={change.itemId} className="delay-modal__diff-row">
                    <span className="delay-modal__diff-item-name" title={change.title}>
                      {change.title || change.itemId}
                    </span>
                    <span className="delay-modal__diff-time-change">
                      <s>{formatTime(change.oldStart)}</s> → <span>{formatTime(change.newStart)}</span>
                    </span>
                  </div>
                ))}
              </div>

              {/* Post-delay smart actions */}
              <div className="delay-modal__smart-actions">
                <span className="delay-modal__smart-title">Suggested Smart Actions</span>
                <div className="delay-modal__smart-btns">
                  {onGenerateAnnouncement && (
                    <button
                      className="btn btn--ghost btn--sm"
                      onClick={() => {
                        onClose();
                        onGenerateAnnouncement(result.delayMinutes);
                      }}
                    >
                      Generate delay announcement
                    </button>
                  )}
                  {onGenerateScript && (
                    <button
                      className="btn btn--primary btn--sm"
                      onClick={() => {
                        onClose();
                        onGenerateScript(result.delayMinutes);
                      }}
                    >
                      Generate transition script
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="delay-modal__footer">
          {!result ? (
            <>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={() => handleSubmit()}
                disabled={loading}
              >
                {loading ? 'Applying Cascade...' : 'Apply Delay'}
              </button>
            </>
          ) : (
            <button className="btn btn--primary btn--sm" onClick={onClose}>
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
