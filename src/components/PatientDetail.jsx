import React, { useState } from 'react';

export default function PatientDetail({
  patient,
  onBack,
  onOpenEdit,
  onToggleFlag,
  onDelete,
  onAddQuestion,
  onOpenWhatsApp,
  onOpenMessages,
  onOpenGemini,
  onOpenReport,
  onToast
}) {
  const [showHist, setShowHist] = useState(false);
  const [customQuestion, setCustomQuestion] = useState('');
  const [selectedOptions, setSelectedOptions] = useState([]);

  if (!patient) return null;

  const isSevere = (ans) => ['Severe', 'No-bad', 'Severe pain', 'Worse'].includes(ans);

  const getInitials = (name) => {
    return name ? name.split(' ').map(x => x[0]).join('').slice(0, 2) : 'PT';
  };

  const handleToggleOption = (opt) => {
    setSelectedOptions(prev =>
      prev.includes(opt) ? prev.filter(o => o !== opt) : [...prev, opt]
    );
  };

  const handleSendQuestion = () => {
    const q = customQuestion.trim();
    if (!q) {
      onToast('Type a question first');
      return;
    }
    const fullText = selectedOptions.length
      ? `${q} (${selectedOptions.join(' or ')})`
      : q;

    onAddQuestion(patient.id, fullText);
    setCustomQuestion('');
    setSelectedOptions([]);
    onToast('Question added to follow-up');
  };

  return (
    <div>
      <button className="back" onClick={onBack}>
        ← All patients
      </button>

      {/* Patient Header Banner */}
      <div
        className={`pbar ${patient.red || patient.is_flagged ? 'red' : ''}`}
        onClick={onOpenEdit}
        role="button"
        tabIndex={0}
        title="Click to view and edit clinical details"
      >
        <div className="av">{getInitials(patient.name)}</div>
        <div className="grow">
          <h1>{patient.name}</h1>
          <small>
            {patient.phone} • {patient.dept} • Day {patient.day_post_discharge || patient.day || 1} after discharge
          </small>
        </div>
        <span className={`pill ${patient.red || patient.is_flagged ? 'red' : ''}`}>
          {patient.red || patient.is_flagged ? 'Needs care' : 'Stable'}
        </span>
        <span style={{ fontSize: '13px', fontWeight: 500 }}>
          View and edit details ✎
        </span>
      </div>

      {/* Action Toolbar */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '18px' }}>
        <button
          className="btn whatsapp-btn sm"
          onClick={onOpenMessages}
          title="Open unified patient chat & conversation stream"
        >
          💬 Patient Messages & Chat
        </button>
        <button
          className="btn soft sm"
          style={{ background: '#E2E8F0', color: '#1E293B', fontWeight: 600 }}
          onClick={onOpenWhatsApp}
          title="Open WhatsApp Simulator Modal"
        >
          📱 WhatsApp Simulator
        </button>
        <button
          className="btn ai-btn sm"
          onClick={onOpenGemini}
        >
          ✨ Gemini AI Assistant (Follow-Up & Triage)
        </button>
        <button
          className="btn soft sm"
          style={{ background: 'var(--lav)', color: 'var(--ink)', fontWeight: 700 }}
          onClick={onOpenReport}
          title="Analyze patient recovery condition over time"
        >
          📋 Individual Report
        </button>
      </div>

      {/* 2-Column Clinical Layout */}
      <div className="grid2">
        {/* Left Column */}
        <div>
          <div className="card">
            <h2>Today's follow-up</h2>
            {(patient.today || []).map((t, idx) => (
              <div className="q" key={idx}>
                <span className="tag">CareAfter • WhatsApp Follow-Up</span>
                <div className="bub ai">{t.q}</div>
                {t.a ? (
                  <div className={`bub pt ${isSevere(t.a) ? 'sev' : ''}`}>
                    {t.a}
                  </div>
                ) : (
                  <div className="bub wait">Waiting for reply</div>
                )}
              </div>
            ))}

            <button
              className="btn ghost sm"
              onClick={() => setShowHist(!showHist)}
            >
              {showHist ? 'Hide history' : 'View history'}
            </button>

            {showHist && (
              <div className="hist">
                {(patient.history || []).length > 0 ? (
                  patient.history.map((h, i) => (
                    <div key={i}>
                      <div className="hday">{h.d}</div>
                      {h.l.map((x, j) => (
                        <div className="hline" key={j}>
                          <span>{x[0]}</span>
                          <span className={`a ${isSevere(x[1]) ? 'bad' : ''}`}>
                            {x[1]}
                          </span>
                        </div>
                      ))}
                    </div>
                  ))
                ) : (
                  <p style={{ color: 'var(--mute)', marginTop: '8px' }}>No earlier answers yet.</p>
                )}
              </div>
            )}
          </div>

          <div className="card">
            <h2>Colour status</h2>
            <p style={{ color: 'var(--mute)', marginBottom: '12px' }}>
              Set by AI from replies. Clinicians can manually override it anytime.
            </p>
            <div className="acts" style={{ justifyContent: 'flex-start', margin: 0 }}>
              <button
                className={`btn ${patient.red || patient.is_flagged ? 'soft' : 'danger'} sm`}
                onClick={() => onToggleFlag(patient.id, patient.red || patient.is_flagged)}
              >
                {patient.red || patient.is_flagged ? 'Mark as green (Stable)' : 'Mark as red (Needs Care)'}
              </button>
              <button
                className="btn danger sm"
                onClick={() => onDelete(patient.id, patient.name)}
              >
                Remove patient
              </button>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div>
          <div className="card">
            <h2>Ask a question</h2>
            <label htmlFor="cq">Sent to patient's WhatsApp follow-up stream</label>
            <textarea
              id="cq"
              placeholder="For example: Have you checked your blood pressure today?"
              value={customQuestion}
              onChange={(e) => setCustomQuestion(e.target.value)}
            />

            <div className="opts">
              {['Yes / No', 'Moderate / Severe', 'Better / Same / Worse'].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  className={`chip ${selectedOptions.includes(opt) ? 'on' : ''}`}
                  onClick={() => handleToggleOption(opt)}
                >
                  {opt}
                </button>
              ))}
            </div>

            <button className="btn full" onClick={handleSendQuestion}>
              Send question
            </button>
          </div>

          <div className="sug">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <b>AI Clinical Suggestions</b>
              <span style={{ fontSize: '11px', opacity: 0.8 }}>Evidence-based</span>
            </div>
            <ul>
              {(patient.sug || []).map((s, idx) => (
                <li key={idx}>{s}</li>
              ))}
            </ul>
            <div style={{ marginTop: '10px', fontSize: '11.5px', opacity: 0.85, fontStyle: 'italic' }}>
              Human clinical review required before intervention.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
