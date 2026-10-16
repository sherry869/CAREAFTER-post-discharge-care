import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getChatMessages, sendChatMessage, processPatientReplyAI, subscribeToChatUpdates } from '../lib/supabase';

export default function PatientChatView({ patient, onSignOut, onPatientFlagged }) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const chatEndRef = useRef(null);

  const reloadMessages = useCallback(async () => {
    if (!patient?.id) return;
    try {
      const msgs = await getChatMessages(patient.id);
      setMessages(msgs || []);
    } catch (err) {
      console.warn('Failed to load patient chat messages:', err);
    }
  }, [patient?.id]);

  // Initial load
  useEffect(() => {
    reloadMessages();
  }, [reloadMessages]);

  // Real-time synchronization (StorageEvent, BroadcastChannel, and Supabase Realtime) + 2.5s Polling
  useEffect(() => {
    if (!patient?.id) return;

    // 1. Instant event-driven sync
    const unsubscribe = subscribeToChatUpdates((data) => {
      if (!data?.patientId || String(data.patientId) === String(patient.id)) {
        reloadMessages();
      }
    });

    // 2. 2.5-second polling interval for multi-device sync
    const timer = setInterval(() => {
      reloadMessages();
    }, 2500);

    return () => {
      unsubscribe();
      clearInterval(timer);
    };
  }, [patient?.id, reloadMessages]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  const handleSend = async (e) => {
    e?.preventDefault();
    const text = inputText.trim();
    if (!text || isThinking) return;

    setInputText('');

    // 1. Send patient message
    const patientMsg = await sendChatMessage(patient.id, 'patient', text);
    if (patientMsg) {
      setMessages(prev => {
        if (prev.some(m => m.id === patientMsg.id)) return prev;
        return [...prev, patientMsg];
      });
    }

    // 2. AI analyzes reply and formulates adaptive follow-up
    setIsThinking(true);
    try {
      const aiResult = await processPatientReplyAI(patient, text, messages);

      // If concerning symptoms were detected, flag the patient for the admin care team
      if (aiResult.is_concerning || aiResult.flag_patient) {
        if (onPatientFlagged) {
          onPatientFlagged(patient.id, aiResult.concern_reason || 'Symptoms flagged in chat');
        }
      }

      // 3. Save AI response to the conversation
      const aiMsg = await sendChatMessage(
        patient.id,
        'ai',
        aiResult.ai_response,
        {
          is_concerning: aiResult.is_concerning,
          concern_reason: aiResult.concern_reason,
          is_demo: aiResult.is_demo
        }
      );

      if (aiMsg) {
        setMessages(prev => {
          if (prev.some(m => m.id === aiMsg.id)) return prev;
          return [...prev, aiMsg];
        });
      }
    } catch (err) {
      console.warn('AI reply error:', err);
      const fallbackMsg = await sendChatMessage(
        patient.id,
        'ai',
        '[Demo Mode] Thank you for your reply. Our care team has recorded your message.',
        { is_demo: true }
      );
      if (fallbackMsg) {
        setMessages(prev => {
          if (prev.some(m => m.id === fallbackMsg.id)) return prev;
          return [...prev, fallbackMsg];
        });
      }
    } finally {
      setIsThinking(false);
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

  return (
    <div className="patient-chat-screen">
      {/* Top Header - Patient Name and Live Connection Badge */}
      <header className="patient-chat-header">
        <div className="patient-chat-title">
          <div className="patient-avatar-dot"></div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2>{patient.name}</h2>
              <span className="live-badge" title="Live connected with City General Care Team">
                <span className="live-pulse"></span> Connected
              </span>
            </div>
            <small>Post-Discharge Recovery Chat • CareAfter</small>
          </div>
        </div>
        <button
          onClick={onSignOut}
          className="btn-signout-patient"
          title="Sign out of CareAfter"
        >
          Sign out
        </button>
      </header>

      {/* Conversation Area */}
      <main className="patient-chat-body">
        {messages.length === 0 ? (
          <div className="patient-chat-empty">
            <p>Welcome, {patient.name}. Your care team and recovery assistant messages will appear here.</p>
          </div>
        ) : (
          messages.map((m, idx) => {
            const isPatient = m.sender === 'patient';
            const isAI = m.sender === 'ai';
            const isAdmin = m.sender === 'hospital' || m.sender === 'admin';

            return (
              <div
                key={m.id || idx}
                className={`patient-msg-row ${isPatient ? 'row-patient' : 'row-other'}`}
              >
                <div className={`patient-bubble ${isPatient ? 'bubble-patient' : isAI ? 'bubble-ai' : 'bubble-admin'}`}>
                  {/* Sender Badge */}
                  <div className="bubble-sender-label">
                    {isAdmin && <span>🏥 City General Care Team</span>}
                    {isAI && <span>{m.is_demo ? '✨ CareAfter AI [Demo]' : '✨ CareAfter AI Assistant'}</span>}
                    {isPatient && <span>You</span>}
                  </div>

                  {/* Message Content */}
                  <div className="bubble-text">{m.text}</div>

                  {/* Optional Flag Notice if concerning response */}
                  {isPatient && m.is_concerning && (
                    <div className="bubble-flagged-tag">
                      ⚠️ Flagged for care team review
                    </div>
                  )}

                  {/* Timestamp */}
                  <div className="bubble-time">
                    {formatTime(m.created_at)}
                  </div>
                </div>
              </div>
            );
          })
        )}

        {isThinking && (
          <div className="patient-msg-row row-other">
            <div className="patient-bubble bubble-ai typing">
              <span className="bubble-sender-label">✨ CareAfter AI Assistant</span>
              <div style={{ fontStyle: 'italic', color: 'var(--mute)' }}>
                Reviewing your update...
              </div>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </main>

      {/* Message Input Bar */}
      <footer className="patient-chat-footer">
        <form onSubmit={handleSend} className="patient-chat-form">
          <input
            type="text"
            placeholder="Type your reply or question here..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isThinking}
            autoFocus
          />
          <button
            type="submit"
            className="btn btn-patient-send"
            disabled={!inputText.trim() || isThinking}
          >
            Send
          </button>
        </form>
      </footer>
    </div>
  );
}
