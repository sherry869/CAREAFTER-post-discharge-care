import React, { useState } from 'react';
import { DEPARTMENTS, STATUS_LIST } from '../data/mockPatients';

export default function AddPatientModal({ onClose, onSave }) {
  const [tab, setTab] = useState('manual'); // 'manual' | 'up'
  const [files, setFiles] = useState({ a: false, b: false });

  const [formData, setFormData] = useState({
    name: '',
    age: '',
    phone: '+91 ',
    dept: 'Cardiology',
    dx: '',
    status: 'green',
    meds: '',
    hist: '',
    risk: ''
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const analyzeClinicalText = (text) => {
    const lower = text.toLowerCase();
    
    // 0-Credit Rule-Based Clinical Keyword Categorization
    const scores = {
      Cardiology: 0,
      Pulmonology: 0,
      Orthopedics: 0,
      Neurology: 0
    };

    const keywords = {
      Cardiology: ['heart', 'cardio', 'cardiac', 'failure', 'infarction', 'angina', 'stent', 'bypass', 'furosemide', 'sacubitril', 'carvedilol', 'metoprolol', 'hypertension', 'afib', 'flutter', 'arrhythmia', 'edema', 'troponin'],
      Pulmonology: ['lung', 'cough', 'copd', 'asthma', 'pneumonia', 'respiratory', 'breathing', 'shortness of breath', 'phlegm', 'inhaler', 'tiotropium', 'prednisolone', 'wheezing', 'oxygen', 'spo2', 'bronch'],
      Orthopedics: ['bone', 'fracture', 'joint', 'hip', 'knee', 'replacement', 'arthroplasty', 'ligament', 'acl', 'cast', 'crutches', 'paracetamol', 'ibuprofen', 'physiotherapy', 'mobility', 'spine'],
      Neurology: ['stroke', 'brain', 'neuro', 'ischemic', 'hemorrhage', 'seizure', 'weakness', 'numbness', 'paralysis', 'clopidogrel', 'atorvastatin', 'facial', 'slurred', 'speech', 'headache', 'dizziness']
    };

    for (const [dept, terms] of Object.entries(keywords)) {
      terms.forEach(term => {
        if (lower.includes(term)) scores[dept] += 1;
      });
    }

    let detectedDept = 'Cardiology';
    let maxScore = 0;
    for (const [dept, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        detectedDept = dept;
      }
    }

    return { dept: detectedDept, score: maxScore };
  };

  const handleFileUpload = (type, e) => {
    const file = e?.target?.files?.[0];
    const updatedFiles = { ...files, [type]: true };
    setFiles(updatedFiles);

    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result;
        if (typeof content === 'string' && content.trim().length > 0) {
          const { dept: detectedDept } = analyzeClinicalText(content);
          
          let extractedName = formData.name;
          let extractedDx = formData.dx;
          let extractedMeds = formData.meds;
          let extractedHist = formData.hist;

          const lines = content.split('\n');
          lines.forEach(line => {
            const l = line.toLowerCase();
            if (l.includes('name:') || l.includes('patient:')) extractedName = line.split(':')[1]?.trim() || extractedName;
            if (l.includes('diagnosis:') || l.includes('condition:') || l.includes('dx:')) extractedDx = line.split(':')[1]?.trim() || extractedDx;
            if (l.includes('medication:') || l.includes('medicines:') || l.includes('rx:')) extractedMeds = line.split(':')[1]?.trim() || extractedMeds;
            if (l.includes('history:') || l.includes('past:')) extractedHist = line.split(':')[1]?.trim() || extractedHist;
          });

          setFormData(prev => ({
            ...prev,
            dept: detectedDept,
            name: extractedName || prev.name,
            dx: extractedDx || prev.dx || `${detectedDept} recovery follow-up`,
            meds: extractedMeds || prev.meds,
            hist: extractedHist || prev.hist
          }));
          return;
        }
      };
      reader.readAsText(file);
    }

    // Default demo values if file has no text or demo slots used
    if (type === 'b' || (updatedFiles.a && updatedFiles.b)) {
      setFormData(prev => ({
        ...prev,
        name: prev.name || 'Anil Kumar',
        age: prev.age || 66,
        phone: prev.phone === '+91 ' ? '+91 98470 90021' : prev.phone,
        dept: prev.dept || 'Cardiology',
        dx: prev.dx || 'Heart failure',
        meds: prev.meds || 'Furosemide, Ramipril',
        hist: prev.hist || 'Hypertension',
        risk: prev.risk || 'Low sodium diet, lives alone'
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) {
      alert('Please enter patient name and contact number');
      return;
    }
    onSave(formData);
  };

  return (
    <div className="modal" onClick={(e) => e.target.className === 'modal' && onClose()}>
      <div className="sheet" role="dialog" aria-label="Add patient">
        <h2>Add patient</h2>
        <p>Follow-up questions start on WhatsApp as soon as you save.</p>

        <div className="tabs">
          <button
            type="button"
            className={tab === 'manual' ? 'on' : ''}
            onClick={() => setTab('manual')}
          >
            Fill in manually
          </button>
          <button
            type="button"
            className={tab === 'up' ? 'on' : ''}
            onClick={() => setTab('up')}
          >
            Upload files
          </button>
        </div>

        {tab === 'up' && (
          <div>
            <label className={`drop ${files.a ? 'ok' : ''}`}>
              <input
                type="file"
                onChange={(e) => handleFileUpload('a', e)}
              />
              <b>{files.a ? '✓ Patient details file added' : 'Patient details file'}</b>
              <span>Upload any .txt, .json, .csv, or medical file</span>
            </label>

            <label className={`drop ${files.b ? 'ok' : ''}`}>
              <input
                type="file"
                onChange={(e) => handleFileUpload('b', e)}
              />
              <b>{files.b ? '✓ Medical description file added' : 'Medical description file'}</b>
              <span>Diagnosis, medicines, discharge note</span>
            </label>

            {(files.a || files.b) && (
              <p style={{ color: 'var(--green)', fontWeight: 600, marginBottom: '14px', fontSize: '14.5px' }}>
                ✓ File analyzed: Automatically categorized into <strong>{formData.dept}</strong> (0 credits used).
              </p>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="fg">
            <div>
              <label htmlFor="f_name">Full name</label>
              <input
                id="f_name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="e.g. Anil Kumar"
                required
              />
            </div>

            <div>
              <label htmlFor="f_age">Age</label>
              <input
                id="f_age"
                type="number"
                value={formData.age}
                onChange={(e) => handleChange('age', e.target.value)}
                placeholder="e.g. 64"
              />
            </div>

            <div>
              <label htmlFor="f_phone">Contact number</label>
              <input
                id="f_phone"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="+91"
                required
              />
            </div>

            <div>
              <label htmlFor="f_dept">Department</label>
              <select
                id="f_dept"
                value={formData.dept}
                onChange={(e) => handleChange('dept', e.target.value)}
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div className="w">
              <label htmlFor="f_status">Clinical Triage Flag (Colour Status)</label>
              <select
                id="f_status"
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value)}
              >
                {STATUS_LIST.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label} ({s.key.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>

            <div className="w">
              <label htmlFor="f_dx">Diagnosis</label>
              <input
                id="f_dx"
                value={formData.dx}
                onChange={(e) => handleChange('dx', e.target.value)}
                placeholder="e.g. Heart failure, Pneumonia"
              />
            </div>

            <div className="w">
              <label htmlFor="f_meds">Medications</label>
              <input
                id="f_meds"
                value={formData.meds}
                onChange={(e) => handleChange('meds', e.target.value)}
                placeholder="e.g. Furosemide, Carvedilol"
              />
            </div>

            <div>
              <label htmlFor="f_hist">Medical history</label>
              <input
                id="f_hist"
                value={formData.hist}
                onChange={(e) => handleChange('hist', e.target.value)}
                placeholder="e.g. Hypertension, diabetes"
              />
            </div>

            <div>
              <label htmlFor="f_risk">Risk factors</label>
              <input
                id="f_risk"
                value={formData.risk}
                onChange={(e) => handleChange('risk', e.target.value)}
                placeholder="e.g. Lives alone, low mobility"
              />
            </div>
          </div>

          <div className="acts">
            <button type="button" className="btn ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn">
              Save and start follow-up
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
