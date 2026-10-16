import React, { useState, useEffect, useRef } from 'react';
import { getChatMessages, sendChatMessage } from '../lib/supabase';

export default function WhatsAppSimulator({ patient, onClose, onToast }) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    async function load() {
      const msgs = await getChatMessages(patient.id);
      setMessages(msgs);
    }
    load();
  }, [patient.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = async (textToSend) => {
    const text = textToSend || inputText.trim();
    if (!text) return;

    // Send outgoing message from Hospital / CareAfter
    const newMsg = await sendChatMessage(patient.id, 'hospital', text);
    setMessages(prev => [...prev, newMsg]);
    setInputText('');

    // Simulate patient auto-reply after 1.5 seconds for an impressive live demo
    setIsTyping(true);
    setTimeout(async () => {
      setIsTyping(false);
      let replyText = 'Thank you nurse, I am feeling a bit better today. Taking medicines regularly.';
      if (text.toLowerCase().includes('pain') || text.toLowerCase().includes('breath')) {
        replyText = 'Breathing has been a bit difficult since yesterday evening, but no chest pain.';
      } else if (text.toLowerCase().includes('swelling') || text.toLowerCase().includes('feet')) {
        replyText = 'There is still slight swelling around my right ankle.';
      } else if (text.toLowerCase().includes('water tablet') || text.toLowerCase().includes('tablet')) {
        replyText = 'I took the morning tablet with water after breakfast.';
      }

      const patientReply = await sendChatMessage(patient.id, 'patient', replyText);
      setMessages(prev => [...prev, patientReply]);
      onToast('Simulated patient reply received');
    }, 1500);
  };

  const quickReplies = [
    'How is your breathing today compared to yesterday?',
    'Did you take your prescribed morning medications?',
    'Are you experiencing any dizziness or ankle swelling?',
    'Please remember to record your morning blood pressure.'
  ];

  const getInitials = (name) => {
    return name ? name.split(' ').map(x => x[0]).join('').slice(0, 2) : 'PT';
  };

  const formatTime = (isoString) => {
    if (!isoString) return 'Just now';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="modal" onClick={(e) => e.target.className === 'modal' && onClose()}>
      <div className="wa-container" role="dialog" aria-label="WhatsApp Simulator">
        {/* WhatsApp Header */}
        <div className="wa-header">
          <div className="wa-patient-info">
            <div className="wa-av">{getInitials(patient.name)}</div>
            <div>
              <h3>{patient.name} <span style={{ fontSize: '11px', opacity: 0.8 }}>(Demo Patient)</span></h3>
              <small>{patient.phone} • {isTyping ? 'typing...' : 'online'}</small>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ color: '#fff', fontSize: '22px', padding: '4px 8px', borderRadius: '50%' }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Disclaimer Bar */}
        <div className="wa-disclaimer">
          ⚠️ <strong>Interactive WhatsApp Simulator</strong>: Messages are simulated for demo purposes. No real WhatsApp/SMS is transmitted.
        </div>

        {/* Chat Message Stream */}
        <div className="wa-chat-area">
          <div style={{ textAlign: 'center', margin: '8px 0' }}>
            <span style={{ background: '#e1f3fb', color: '#128c7e', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>
              End-to-end encrypted hospital follow-up • Day {patient.day_post_discharge || patient.day} post-discharge
            </span>
          </div>

          {messages.map((m, idx) => (
            <div
              key={m.id || idx}
              className={`wa-bubble ${m.sender === 'hospital' ? 'outgoing' : 'incoming'}`}
            >
              <div>{m.text}</div>
              <div className="wa-bubble-meta">
                <span>{formatTime(m.created_at)}</span>
                {m.sender === 'hospital' && <span className="wa-check">✓✓</span>}
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="wa-bubble incoming" style={{ color: '#667781', fontStyle: 'italic', fontSize: '13px' }}>
              {patient.name} is typing a response...
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Quick Question Chips for Easy Presentation */}
        <div className="wa-quick-replies">
          {quickReplies.map((q, i) => (
            <button
              key={i}
              className="wa-quick-btn"
              onClick={() => handleSend(q)}
            >
              + {q}
            </button>
          ))}
        </div>

        {/* Message Input Box */}
        <form
          className="wa-input-bar"
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
        >
          <input
            type="text"
            placeholder="Type a clinical follow-up message..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />
          <button type="submit" className="wa-send-btn" title="Send Message">
            ➤
          </button>
        </form>
      </div>
    </div>
  );
}
