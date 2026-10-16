import React, { useState } from 'react';
import clinicalKnowledge from '../data/clinicalKnowledge.json';

export default function PatientReportModal({ patient, onClose, onToast }) {
  const [aiNote, setAiNote] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);

  if (!patient) return null;

  // Temporal analysis of patient condition over time
  const timeline = [];
  
  // Historical days
  if (patient.history && Array.isArray(patient.history)) {
    patient.history.forEach(h => {
      const dayLabel = h.d || 'Previous Day';
      const issues = (h.l || []).filter(item => {
        const ans = String(item[1]).toLowerCase();
        return ans === 'yes' && item[0].toLowerCase().includes('weight') ||
               ans === 'yes' && item[0].toLowerCase().includes('swelling') ||
               ans === 'moderate' || ans === 'severe' ||
               ans === 'no' && item[0].toLowerCase().includes('medic');
      });
      timeline.push({
        day: dayLabel,
        totalQuestions: (h.l || []).length,
        concerns: issues.length,
        entries: h.l || []
      });
    });
  }

  // Today's follow-up
  const todayQuestions = patient.today || [];
  const todaySevereCount = todayQuestions.filter(q =>
    ['severe', 'no-bad', 'yes'].some(bad => String(q.a).toLowerCase().includes(bad)) &&
    (q.q.toLowerCase().includes('breathing') || q.q.toLowerCase().includes('swelling') || q.q.toLowerCase().includes('tablet'))
  ).length;

  timeline.unshift({
    day: `Day ${patient.day_post_discharge || patient.day || 1} (Today)`,
    totalQuestions: todayQuestions.length,
    concerns: todaySevereCount,
    entries: todayQuestions.map(t => [t.q, t.a || 'Pending reply'])
  });

  // Calculate overall trajectory
  let trajectory = 'Stable';
  let trajectoryColor = 'green';
  let triageCategory = clinicalKnowledge.triage_categories[2]; // ROUTINE

  if (patient.red || patient.is_flagged || todaySevereCount >= 2) {
    trajectory = 'Deteriorating - Attention Required';
    trajectoryColor = 'red';
    triageCategory = clinicalKnowledge.triage_categories[0]; // HIGH / RED
  } else if (todaySevereCount === 1 || patient.day <= 3) {
    trajectory = 'Guarded / In Recovery';
    trajectoryColor = 'peach';
    triageCategory = clinicalKnowledge.triage_categories[1]; // MODERATE / AMBER
  }

  // Minimal Credit / Zero-Credit fallback AI synthesis
  const handleGenerateAiSummary = async () => {
    setLoadingAi(true);
    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'summarize_triage',
          patient,
          responses: todayQuestions
        })
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || `HTTP ${res.status}`);
      }

      setAiNote(json.data?.summary || 'Patient recovery reviewed.');
      onToast('AI clinical note synthesized');
    } catch (err) {
      // Zero-credit local clinical rule fallback
      setAiNote(
        `Automated Rule Analysis: ${patient.name} shows ${trajectory.toLowerCase()} trajectory at Day ${patient.day_post_discharge || patient.day}. ` +
        (patient.red ? 'Flagged for fluid retention / symptom worsening. Physician consult advised.' : 'Patient remains on expected recovery pathway.')
      );
      onToast('Generated clinical analysis');
    } finally {
      setLoadingAi(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal" onClick={(e) => e.target.className === 'modal' && onClose()}>
      <div className="sheet" role="dialog" aria-label="Individual Patient Report" style={{ maxWidth: '780px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1.5px solid var(--line)', paddingBottom: '14px', marginBottom: '18px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="demo-badge">CLINICAL TIMELINE REPORT</span>
              <span style={{ fontSize: '11.5px', color: 'var(--mute)' }}>Generated: {new Date().toLocaleDateString()}</span>
            </div>
            <h2 style={{ fontSize: '24px', marginTop: '6px' }}>{patient.name}</h2>
            <p style={{ color: 'var(--mute)', fontSize: '13.5px' }}>
              {patient.age} yrs • {patient.dept} • Dx: <strong>{patient.dx}</strong> • Day {patient.day_post_discharge || patient.day} post-discharge
            </p>
          </div>
          <button className="btn ghost sm" onClick={onClose}>✕</button>
        </div>

        {/* Clinical Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '18px' }}>
          {/* Trajectory */}
          <div style={{ background: 'var(--surface)', border: '1.5px solid var(--line)', borderRadius: '18px', padding: '14px' }}>
            <span style={{ fontSize: '12px', color: 'var(--mute)', display: 'block', marginBottom: '4px' }}>Recovery Trajectory</span>
            <b style={{ fontSize: '16px', color: trajectoryColor === 'red' ? 'var(--red)' : 'var(--green)' }}>
              {trajectory}
            </b>
            <small style={{ display: 'block', color: 'var(--mute)', marginTop: '4px' }}>
              Based on {timeline.length} follow-up checkpoints
            </small>
          </div>

          {/* Triage Level */}
          <div style={{ background: 'var(--surface)', border: '1.5px solid var(--line)', borderRadius: '18px', padding: '14px' }}>
            <span style={{ fontSize: '12px', color: 'var(--mute)', display: 'block', marginBottom: '4px' }}>Triage Priority</span>
            <b style={{ fontSize: '16px', color: triageCategory.code === 'RED' ? 'var(--red)' : 'var(--ink)' }}>
              {triageCategory.title}
            </b>
            <small style={{ display: 'block', color: 'var(--mute)', marginTop: '4px' }}>
              {triageCategory.action}
            </small>
          </div>

          {/* Medications & Risks */}
          <div style={{ background: 'var(--surface)', border: '1.5px solid var(--line)', borderRadius: '18px', padding: '14px' }}>
            <span style={{ fontSize: '12px', color: 'var(--mute)', display: 'block', marginBottom: '4px' }}>Medications</span>
            <div style={{ fontSize: '13px', fontWeight: 600 }}>{patient.meds || patient.medications || 'None specified'}</div>
            <small style={{ display: 'block', color: 'var(--mute)', marginTop: '4px' }}>
              Risk: {patient.risk || patient.risk_factors || 'None'}
            </small>
          </div>
        </div>

        {/* Day-by-Day Timeline Analysis */}
        <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>Day-by-Day Clinical Responses Over Time</h3>
        <div style={{ background: 'var(--surface)', border: '1.5px solid var(--line)', borderRadius: '18px', padding: '16px', marginBottom: '18px' }}>
          {timeline.map((point, idx) => (
            <div key={idx} style={{ marginBottom: idx === timeline.length - 1 ? 0 : '14px', borderBottom: idx === timeline.length - 1 ? 'none' : '1px dashed var(--line)', paddingBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <b style={{ fontSize: '14px', color: 'var(--ink)' }}>{point.day}</b>
                <span className={`pill ${point.concerns > 0 ? 'red' : ''}`} style={{ fontSize: '11px', padding: '2px 8px' }}>
                  {point.concerns > 0 ? `${point.concerns} Alert(s)` : 'All Stable'}
                </span>
              </div>
              <div style={{ display: 'grid', gap: '4px' }}>
                {point.entries.map(([q, a], j) => {
                  const isBad = ['severe', 'no-bad', 'yes'].some(bad => String(a).toLowerCase().includes(bad)) &&
                                (q.toLowerCase().includes('breathing') || q.toLowerCase().includes('swelling') || q.toLowerCase().includes('tablet'));
                  return (
                    <div key={j} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--ink)' }}>
                      <span style={{ color: 'var(--mute)' }}>• {q}</span>
                      <strong style={{ color: isBad ? 'var(--red)' : 'var(--green)' }}>{a}</strong>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* AI Clinical Note Section */}
        <div style={{ background: 'var(--peach)', borderRadius: '18px', padding: '16px', marginBottom: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <b style={{ color: '#262a33' }}>AI Longitudinal Synthesis</b>
            <span style={{ fontSize: '11px', opacity: 0.8 }}>Uses minimal credits</span>
          </div>
          {aiNote ? (
            <p style={{ fontSize: '13.5px', color: '#262a33', lineHeight: 1.45 }}>{aiNote}</p>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <span style={{ fontSize: '12.5px', color: '#5b4631' }}>
                Click below to summarize temporal trend with Gemini Flash.
              </span>
              <button
                className="btn sm"
                style={{ background: '#262a33', color: '#fff' }}
                onClick={handleGenerateAiSummary}
                disabled={loadingAi}
              >
                {loadingAi ? 'Synthesizing...' : '✨ Generate Concise AI Summary'}
              </button>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="acts" style={{ justifyContent: 'space-between' }}>
          <button className="btn ghost sm" onClick={handlePrint}>
            🖨️ Print / Save PDF
          </button>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn sm" onClick={onClose}>
              Close Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
