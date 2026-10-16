import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getChatMessages, sendChatMessage, subscribeToChatUpdates } from '../lib/supabase';
import { getPatientStatus, STATUS_CONFIG, STATUS_LIST } from '../data/mockPatients';

export default function AdminMessages({
  patients = [],
  selectedPatientId,
  onSelectPatient,
  onToggleFlag,
  onSetStatus,
  onToast
}) {
  const [activeId, setActiveId] = useState(selectedPatientId || patients[0]?.id);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [draftingAI, setDraftingAI] = useState(false);
  const chatEndRef = useRef(null);

  // Sync activeId when selectedPatientId changes from parent
  useEffect(() => {
    if (selectedPatientId) {
      setActiveId(selectedPatientId);
    } else if (!activeId && patients.length > 0) {
      setActiveId(patients[0].id);
    }
  }, [selectedPatientId, patients]);

  // Load chat messages function
  const reloadMessages = useCallback(async (isSilent = false) => {
    if (!activeId) return;
    if (!isSilent) setLoading(true);
    try {
      const msgs = await getChatMessages(activeId);
      setMessages(msgs || []);
    } catch (err) {
      console.warn('Error loading messages for patient', activeId, err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [activeId]);

  // Initial load when active patient changes
  useEffect(() => {
    reloadMessages(false);
  }, [reloadMessages]);

  // Real-time synchronization via BroadcastChannel, StorageEvent, and Supabase Realtime
  useEffect(() => {
    if (!activeId) return;

    // 1. Event-driven instant updates
    const unsubscribe = subscribeToChatUpdates((data) => {
      if (!data?.patientId || String(data.patientId) === String(activeId)) {
        reloadMessages(true);
      }
    });

    // 2. Continuous 2.5-second live polling (syncs cross-device & cross-tab)
    const timer = setInterval(() => {
      reloadMessages(true);
    }, 2500);

    return () => {
      unsubscribe();
      clearInterval(timer);
    };
  }, [activeId, reloadMessages]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const activePatient = patients.find(p => p.id === activeId) || patients[0];
  const activeStatus = getPatientStatus(activePatient);

  const handleSendManual = async (e) => {
    e?.preventDefault();
    const text = inputText.trim();
    if (!text || !activePatient) return;

    setInputText('');
    const newMsg = await sendChatMessage(activePatient.id, 'hospital', text);
    if (newMsg) {
      setMessages(prev => {
        // Prevent duplicate appending
        if (prev.some(m => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
    }
    if (onToast) onToast(`Message sent to ${activePatient.name}`);
  };

  const handleDraftAIQuestion = async () => {
    if (!activePatient || draftingAI) return;
    setDraftingAI(true);
    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'generate_question',
          patient: activePatient
        })
      });
      const json = await res.json();
      if (json.success && json.data?.question) {
        setInputText(json.data.question);
        if (onToast) onToast('AI question drafted into message box');
      } else {
        setInputText(`How are you feeling today, ${activePatient.name}?`);
      }
    } catch {
      setInputText(`How is your recovery progressing today on Day ${activePatient.day_post_discharge || activePatient.day || 1}?`);
    } finally {
      setDraftingAI(false);
    }
  };

  const handleStatusChange = (statusKey) => {
    if (!activePatient) return;
    if (onSetStatus) {
      onSetStatus(activePatient.id, statusKey);
    } else if (onToggleFlag) {
      onToggleFlag(activePatient.id, statusKey === 'red');
    }
    const label = STATUS_CONFIG[statusKey]?.label || statusKey;
    if (onToast) onToast(`${activePatient.name} marked as: ${label}`);
  };

  const formatTime = (isoString) => {
    if (!isoString) return '';
    try {
      return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const concerningMessages = messages.filter(m => m.is_concerning);

  return (
    <div className="admin-messages-layout">
      {/* Left Patient Selector Column */}
      <aside className="admin-msg-sidebar">
        <div className="admin-msg-sidebar-header">
          <h3>Patient Conversations</h3>
          <span className="live-badge">
            <span className="live-pulse"></span> Live
          </span>
        </div>

        <div className="admin-msg-patient-list">
          {patients.map(p => {
            const pStatus = getPatientStatus(p);
            const isSelected = p.id === activePatient?.id;
            return (
              <button
                key={p.id}
                className={`admin-msg-patient-item ${isSelected ? 'active' : ''} flagged-${pStatus.key}`}
                onClick={() => {
                  setActiveId(p.id);
                  if (onSelectPatient) onSelectPatient(p.id);
                }}
              >
                <div className="admin-msg-item-top">
                  <b>{p.name}</b>
                  <span className={`pill ${pStatus.pillClass}`} style={{ fontSize: '11px', padding: '2px 8px' }}>
                    {pStatus.label}
                  </span>
                </div>
                <div className="admin-msg-item-meta">
                  <span>{p.dx}</span> • <span>Day {p.day_post_discharge || p.day || 1}</span>
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--mute)' }}>
                  {p.phone}
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Right Conversation Stream Pane */}
      <main className="admin-msg-main">
        {activePatient ? (
          <>
            {/* Conversation Header */}
            <div className="admin-msg-header">
              <div className="admin-msg-header-info">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h2>{activePatient.name}</h2>
                  <span className={`pill ${activeStatus.pillClass}`}>
                    {activeStatus.label}
                  </span>
                  <span className="live-badge" title="Live synced across patients and care team">
                    <span className="live-pulse"></span> Synced
                  </span>
                </div>
                <p>
                  {activePatient.phone} • {activePatient.dept} • {activePatient.dx} (Day {activePatient.day_post_discharge || activePatient.day || 1})
                </p>
              </div>

              {/* 4-Tier Quick Status Actions */}
              <div className="admin-msg-header-actions" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {STATUS_LIST.map(s => {
                  const isActive = activeStatus.key === s.key;
                  return (
                    <button
                      key={s.key}
                      type="button"
                      className={`btn sm ${isActive ? 'active' : 'ghost'}`}
                      style={{
                        padding: '6px 10px',
                        fontSize: '12px',
                        fontWeight: 700,
                        border: `1.5px solid ${s.color}`,
                        background: isActive ? s.color : 'transparent',
                        color: isActive ? '#FFFFFF' : s.color
                      }}
                      onClick={() => handleStatusChange(s.key)}
                      title={`Change flag to ${s.label}`}
                    >
                      {isActive ? `✓ ${s.label}` : s.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Concerning Responses Alert Banner */}
            {(activeStatus.key === 'red' || concerningMessages.length > 0) && (
              <div className="admin-concerning-banner">
                <span style={{ fontSize: '18px' }}>⚠️</span>
                <div>
                  <strong>Attention Required for Clinical Team:</strong>
                  <p>
                    {concerningMessages.length > 0
                      ? concerningMessages[concerningMessages.length - 1].concern_reason || 'Patient reported symptoms of concern in chat.'
                      : 'This patient is currently flagged for urgent clinical care.'}
                  </p>
                </div>
              </div>
            )}

            {/* Chat Messages Stream */}
            <div className="admin-msg-stream">
              {loading && messages.length === 0 ? (
                <div className="admin-msg-empty">Loading conversation...</div>
              ) : messages.length === 0 ? (
                <div className="admin-msg-empty">
                  No messages exchanged yet with {activePatient.name}. Send a follow-up check below.
                </div>
              ) : (
                messages.map((m, idx) => {
                  const isPatient = m.sender === 'patient';
                  const isAI = m.sender === 'ai';
                  const isStaff = m.sender === 'hospital' || m.sender === 'admin';

                  return (
                    <div
                      key={m.id || idx}
                      className={`admin-msg-bubble-wrap ${isStaff ? 'wrap-staff' : isPatient ? 'wrap-patient' : 'wrap-ai'}`}
                    >
                      <div className={`admin-msg-bubble ${isStaff ? 'bubble-staff' : isPatient ? 'bubble-pt' : 'bubble-ai'} ${m.is_concerning ? 'bubble-concerning' : ''}`}>
                        <div className="admin-bubble-label">
                          {isStaff && <span>🏥 Hospital Staff (You)</span>}
                          {isAI && <span>{m.is_demo ? '✨ CareAfter AI [Demo]' : '✨ CareAfter AI Assistant'}</span>}
                          {isPatient && <span>👤 Patient: {activePatient.name}</span>}
                          {m.is_concerning && <span className="pill red" style={{ marginLeft: '6px', fontSize: '10px' }}>⚠️ CONCERNING</span>}
                        </div>

                        <div className="admin-bubble-text">{m.text}</div>

                        {m.is_concerning && m.concern_reason && (
                          <div style={{ marginTop: '6px', fontSize: '11px', color: '#BE123C', fontStyle: 'italic' }}>
                            Clinical Note: {m.concern_reason}
                          </div>
                        )}

                        <div className="admin-bubble-time">{formatTime(m.created_at)}</div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input & AI Draft Bar */}
            <div className="admin-msg-input-area">
              <div className="admin-msg-tools">
                <button
                  type="button"
                  className="btn ghost sm"
                  onClick={handleDraftAIQuestion}
                  disabled={draftingAI}
                >
                  {draftingAI ? 'Synthesizing question...' : '✨ Draft AI Follow-Up Question'}
                </button>
              </div>

              <form onSubmit={handleSendManual} className="admin-msg-form">
                <input
                  type="text"
                  placeholder={`Send message to ${activePatient.name}...`}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                />
                <button
                  type="submit"
                  className="btn sm"
                  disabled={!inputText.trim()}
                >
                  Send
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="admin-msg-empty">Select a patient to read conversation.</div>
        )}
      </main>
    </div>
  );
}
