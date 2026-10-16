import React, { useState } from 'react';

export default function GeminiModal({ patient, onClose, onUseQuestion, onUpdateSuggestions, onToast }) {
  const [activeTab, setActiveTab] = useState('question'); // 'question' | 'summary'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [questionResult, setQuestionResult] = useState(null);
  const [summaryResult, setSummaryResult] = useState(null);

  // Calls the server-side /api/gemini route
  const handleGenerateQuestion = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'generate_question',
          patient
        })
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || `HTTP ${res.status}`);
      }

      setQuestionResult(json.data);
      onToast('AI follow-up question generated');
    } catch (err) {
      setError(err.message || 'Failed to call Gemini API');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'summarize_triage',
          patient,
          responses: patient.today || []
        })
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || `HTTP ${res.status}`);
      }

      setSummaryResult(json.data);
      if (json.data?.suggestions && onUpdateSuggestions) {
        onUpdateSuggestions(json.data.suggestions);
      }
      onToast('Recovery summary & triage generated');
    } catch (err) {
      setError(err.message || 'Failed to call Gemini API');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal" onClick={(e) => e.target.className === 'modal' && onClose()}>
      <div className="sheet" role="dialog" aria-label="Gemini Clinical Assistant">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2>✨ Gemini AI Clinical Assistant</h2>
            <p>Post-discharge clinical support for <strong>{patient.name}</strong> ({patient.dx})</p>
          </div>
          <button className="btn ghost sm" onClick={onClose}>✕</button>
        </div>

        <div className="tabs">
          <button
            className={activeTab === 'question' ? 'on' : ''}
            onClick={() => setActiveTab('question')}
          >
            Generate Follow-up Question
          </button>
          <button
            className={activeTab === 'summary' ? 'on' : ''}
            onClick={() => setActiveTab('summary')}
          >
            Response Analysis & Triage
          </button>
        </div>

        {/* Clinical Disclaimer Notice */}
        <div style={{
          background: 'var(--redbg)',
          color: 'var(--red)',
          padding: '10px 14px',
          borderRadius: '14px',
          fontSize: '12px',
          marginBottom: '16px',
          display: 'flex',
          gap: '8px',
          alignItems: 'center'
        }}>
          <span>🛡️</span>
          <span>
            <strong>Human Clinical Review Required:</strong> AI suggestions are assistive only. Healthcare professionals must review all questions and actions before reaching patients.
          </span>
        </div>

        {error && (
          <div style={{
            background: '#fee2e2',
            color: '#b91c1c',
            padding: '12px',
            borderRadius: '12px',
            marginBottom: '16px',
            fontSize: '13px'
          }}>
            <strong>Error:</strong> {error}
            <div style={{ marginTop: '6px', fontSize: '12px', color: '#7f1d1d' }}>
              Ensure your <code>GEMINI_API_KEY</code> is correctly set in <code>.env</code> or Vercel Settings.
            </div>
          </div>
        )}

        {/* Tab 1: Generate Follow-up Question */}
        {activeTab === 'question' && (
          <div>
            <p style={{ color: 'var(--mute)', fontSize: '13.5px', marginBottom: '14px' }}>
              Gemini will formulate a targeted, patient-friendly check-in question based on <strong>Day {patient.day_post_discharge || patient.day}</strong> post-discharge, prescribed <strong>{patient.meds || 'medications'}</strong>, and identified risk factors.
            </p>

            <button
              className="btn ai-btn full"
              onClick={handleGenerateQuestion}
              disabled={loading}
            >
              {loading ? 'Synthesizing with Gemini 2.5 Flash...' : '✨ Generate Tailored Question'}
            </button>

            {questionResult && (
              <div style={{ marginTop: '20px', background: 'var(--surface)', border: '1.5px solid var(--line)', borderRadius: '18px', padding: '16px' }}>
                <span className="ai-badge">Gemini Flash Suggestion</span>
                <h3 style={{ fontSize: '16px', margin: '6px 0 10px', color: 'var(--ink)' }}>
                  "{questionResult.question}"
                </h3>

                {questionResult.suggested_options && (
                  <div style={{ marginBottom: '12px' }}>
                    <small style={{ color: 'var(--mute)', display: 'block', marginBottom: '6px' }}>Suggested Quick Options:</small>
                    <div className="opts">
                      {questionResult.suggested_options.map((opt, i) => (
                        <span key={i} className="chip on" style={{ fontSize: '12px', padding: '4px 10px' }}>
                          {opt}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {questionResult.clinical_rationale && (
                  <p style={{ fontSize: '12.5px', color: 'var(--mute)', fontStyle: 'italic', marginBottom: '14px' }}>
                    <strong>Clinical rationale:</strong> {questionResult.clinical_rationale}
                  </p>
                )}

                <div className="acts">
                  <button
                    className="btn sm"
                    onClick={() => {
                      onUseQuestion(questionResult.question, questionResult.suggested_options);
                      onClose();
                    }}
                  >
                    Use in Follow-up Queue
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Response Analysis & Triage */}
        {activeTab === 'summary' && (
          <div>
            <p style={{ color: 'var(--mute)', fontSize: '13.5px', marginBottom: '14px' }}>
              Gemini evaluates recorded follow-up answers to recommend whether this patient requires immediate clinician outreach or routine home monitoring.
            </p>

            <button
              className="btn ai-btn full"
              onClick={handleGenerateSummary}
              disabled={loading}
            >
              {loading ? 'Evaluating Responses with Gemini...' : '✨ Analyze Patient Responses & Triage'}
            </button>

            {summaryResult && (
              <div style={{ marginTop: '20px', background: 'var(--surface)', border: '1.5px solid var(--line)', borderRadius: '18px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span className="ai-badge">Triage Assessment</span>
                  <span className={`pill ${summaryResult.priority === 'HIGH' ? 'red' : ''}`}>
                    {summaryResult.priority === 'HIGH' ? '⚠️ High Attention / Red' : '✓ Routine Stable'}
                  </span>
                </div>

                <p style={{ fontSize: '14px', marginBottom: '12px', fontWeight: 500 }}>
                  {summaryResult.summary}
                </p>

                {summaryResult.suggestions && (
                  <div className="sug" style={{ marginTop: '8px' }}>
                    <b>Recommended Care Team Actions:</b>
                    <ul>
                      {summaryResult.suggestions.map((s, idx) => (
                        <li key={idx}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="acts" style={{ marginTop: '20px' }}>
          <button className="btn ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
