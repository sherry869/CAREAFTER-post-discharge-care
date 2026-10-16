import React, { useState, useEffect, useRef } from 'react';
import { getChatMessages, sendChatMessage } from '../lib/supabase';

export default function AdminMessages({
  patients = [],
  selectedPatientId,
  onSelectPatient,
  onToggleFlag,
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

  // Load chat messages whenever activeId changes
  useEffect(() => {
    async function fetchMessages() {
      if (!activeId) return;
      setLoading(true);
      const msgs = await getChatMessages(activeId);
      setMessages(msgs || []);
      setLoading(false);
    }
    fetchMessages();
  }, [activeId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const activePatient = patients.find(p => p.id === activeId) || patients[0];

  const handleSendManual = async (e) => {
    e?.preventDefault();
    const text = inputText.trim();
    if (!text || !activePatient) return;

    setInputText('');
    const newMsg = await sendChatMessage(activePatient.id, 'hospital', text);
    setMessages(prev => [...prev, newMsg]);
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

  const formatTime = (isoString) => {
    if (!isoString) return '';
    try {
      return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const isFlagged = activePatient?.red || activePatient?.is_flagged;
  const concerningMessages = messages.filter(m => m.is_concerning);

  return (
    <div className="admin-messages-layout">
      {/* Left Patient Selector Column */}
      <aside className="admin-msg-sidebar">
        <div className="admin-msg-sidebar-header">
          <h3>Patient Conversations</h3>
          <span className="pill">{patients.length} active</span>
        </div>

        <div className="admin-msg-patient-list">
          {patients.map(p => {
            const flagged = p.red || p.is_flagged;
            const isSelected = p.id === activePatient?.id;
            return (
              <button
                key={p.id}
                className={`admin-msg-patient-item ${isSelected ? 'active' : ''} ${flagged ? 'flagged' : ''}`}
                onClick={() => {
                  setActiveId(p.id);
                  if (onSelectPatient) onSelectPatient(p.id);
                }}
              >
                <div className="admin-msg-item-top">
                  <b>{p.name}</b>
                  {flagged && <span className="pill red">Needs Care</span>}
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
                <h2>{activePatient.name}</h2>
                <p>
                  {activePatient.phone} • {activePatient.dept} • {activePatient.dx} (Day {activePatient.day_post_discharge || activePatient.day || 1})
                </p>
              </div>

              <div className="admin-msg-header-actions">
                <button
                  className={`btn sm ${isFlagged ? 'soft' : 'danger'}`}
                  onClick={() => onToggleFlag && onToggleFlag(activePatient.id, isFlagged)}
                  title="Toggle patient attention flag"
                >
                  {isFlagged ? '✓ Mark as Stable' : '⚑ Flag for Review'}
                </button>
              </div>
            </div>

            {/* Concerning Responses Alert Banner */}
            {(isFlagged || concerningMessages.length > 0) && (
              <div className="admin-concerning-banner">
                <span style={{ fontSize: '18px' }}>⚠️</span>
                <div>
                  <strong>Attention Required for Clinical Team:</strong>
                  <p>
                    {concerningMessages.length > 0
                      ? concerningMessages[concerningMessages.length - 1].concern_reason || 'Patient reported symptoms of concern in chat.'
                      : 'This patient is currently flagged for clinical review.'}
                  </p>
                </div>
              </div>
            )}

            {/* Chat Messages Stream */}
            <div className="admin-msg-stream">
              {loading ? (
                <div className="admin-msg-empty">Loading conversation...</div>
              ) : messages.length === 0 ? (
                <div className="admin-msg-empty">
                  No messages exchanged yet with {activePatient.name}.
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
                  placeholder={`Send manual message to ${activePatient.name}...`}
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
