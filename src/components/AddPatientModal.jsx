import React, { useState } from 'react';
import { DEPARTMENTS, STATUS_LIST } from '../data/mockPatients';

export default function AddPatientModal({ onClose, onSave }) {
  const [tab, setTab] = useState('manual'); // 'manual' | 'up'
  const [files, setFiles] = useState({ a: false, b: false });
  const [fileNames, setFileNames] = useState({ a: '', b: '' });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisMsg, setAnalysisMsg] = useState('');

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

  const parseClientText = (text, fileName = '') => {
    const lower = (text || '').toLowerCase();
    const cleanFileName = (fileName || '')
      .replace(/\.[^/.]+$/, '')
      .replace(/[_-]/g, ' ')
      .replace(/discharge|summary|report|note|medical|record|patient/gi, '')
      .trim();

    // 1. Department Categorization
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
    let maxScore = -1;
    for (const [dept, score] of Object.entries(scores)) {
      if (score > maxScore && score > 0) {
        maxScore = score;
        detectedDept = dept;
      }
    }

    // 2. Name Extraction (NEVER hardcode Anil Kumar)
    let extractedName = '';
    const nameMatch = (text || '').match(/(?:patient(?:\s*name)?|name|pt\.?\s*name)[\s:=–-]+([A-Za-z\s.'-]{2,40})/i);
    if (nameMatch && nameMatch[1]) {
      extractedName = nameMatch[1].trim();
    } else if (cleanFileName && cleanFileName.length > 2) {
      extractedName = cleanFileName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }

    // 3. Age Extraction
    let extractedAge = '';
    const ageMatch = (text || '').match(/(?:age|years?\s*old|y[\/.]?o)[\s:=–-]*([0-9]{1,3})/i) ||
                     (text || '').match(/\b([0-9]{1,3})\s*(?:years?\s*old|y[\/.]?o|yrs?\s*old)\b/i);
    if (ageMatch && ageMatch[1]) {
      extractedAge = Number(ageMatch[1]);
    }

    // 4. Contact / Phone Extraction
    let extractedPhone = '';
    const phoneMatch = (text || '').match(/(?:phone|contact|mobile|tel)[\s:=–-]*([+\d\s()-]{8,18})/i) ||
                       (text || '').match(/(?:\+?91[\s-]?)?[6-9]\d{9}/);
    if (phoneMatch && phoneMatch[0]) {
      extractedPhone = phoneMatch[0].trim();
    }

    // 5. Diagnosis Extraction
    let extractedDx = '';
    const dxMatch = (text || '').match(/(?:diagnosis|condition|impression|dx|assessment)[\s:=–-]+([^\n\r;]{3,80})/i);
    if (dxMatch && dxMatch[1]) {
      extractedDx = dxMatch[1].trim();
    } else if (maxScore > 0) {
      extractedDx = `${detectedDept} recovery follow-up`;
    }

    // 6. Medications Extraction
    let extractedMeds = '';
    const medsMatch = (text || '').match(/(?:medications?|medicines?|rx|prescriptions?)[\s:=–-]+([^\n\r]{3,100})/i);
    if (medsMatch && medsMatch[1]) {
      extractedMeds = medsMatch[1].trim();
    }

    // 7. Medical History
    let extractedHist = '';
    const histMatch = (text || '').match(/(?:medical\s*history|past\s*history|pmhx?|history)[\s:=–-]+([^\n\r]{3,100})/i);
    if (histMatch && histMatch[1]) {
      extractedHist = histMatch[1].trim();
    }

    // 8. Risk Factors
    let extractedRisk = '';
    const riskMatch = (text || '').match(/(?:risk\s*factors?|risks?|comorbidities|alerts?)[\s:=–-]+([^\n\r]{3,100})/i);
    if (riskMatch && riskMatch[1]) {
      extractedRisk = riskMatch[1].trim();
    }

    // 9. Status Flag
    let status = 'green';
    if (lower.includes('critical') || lower.includes('severe') || lower.includes('unstable') || lower.includes('acute')) {
      status = 'red';
    } else if (lower.includes('observation') || lower.includes('moderate') || lower.includes('monitor')) {
      status = 'amber';
    } else if (lower.includes('follow-up') || lower.includes('due') || lower.includes('routine')) {
      status = 'blue';
    }

    return {
      name: extractedName,
      age: extractedAge,
      phone: extractedPhone,
      dept: detectedDept,
      dx: extractedDx,
      status,
      meds: extractedMeds,
      hist: extractedHist,
      risk: extractedRisk
    };
  };

  const handleFileUpload = async (slot, e) => {
    const file = e?.target?.files?.[0];
    if (!file) return;

    setFiles(prev => ({ ...prev, [slot]: true }));
    setFileNames(prev => ({ ...prev, [slot]: file.name }));
    setIsAnalyzing(true);
    setAnalysisMsg('✨ AI reading file and extracting patient clinical details...');

    const isBinaryOrPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf') || file.type.startsWith('image/');

    const reader = new FileReader();

    reader.onload = async (event) => {
      const rawResult = event.target?.result;
      let textContent = '';
      let base64Data = null;

      if (isBinaryOrPdf) {
        if (typeof rawResult === 'string' && rawResult.includes(',')) {
          base64Data = rawResult.split(',')[1];
        }
      } else if (typeof rawResult === 'string') {
        textContent = rawResult;
      }

      let parsedData = null;

      // 1. Try Gemini AI Extraction
      try {
        const res = await fetch('/api/gemini', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'parse_medical_file',
            fileName: file.name,
            fileContent: textContent,
            mimeType: file.type || (isBinaryOrPdf ? 'application/pdf' : 'text/plain'),
            base64Data
          })
        });

        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            parsedData = json.data;
          }
        }
      } catch (err) {
        console.warn('Gemini extraction failed, using clinical regex fallback:', err);
      }

      // 2. Fallback to client-side clinical regex extraction if needed
      if (!parsedData || (!parsedData.name && !parsedData.dx)) {
        parsedData = parseClientText(textContent || file.name, file.name);
      }

      // 3. Populate Form with extracted patient data (Only overwrite with non-empty values)
      setFormData(prev => {
        const next = { ...prev };
        if (parsedData.name && parsedData.name.trim()) next.name = parsedData.name.trim();
        if (parsedData.age) next.age = parsedData.age;
        if (parsedData.phone && parsedData.phone.trim().length > 4) next.phone = parsedData.phone.trim();
        if (parsedData.dept) next.dept = parsedData.dept;
        if (parsedData.dx && parsedData.dx.trim()) next.dx = parsedData.dx.trim();
        if (parsedData.status) next.status = parsedData.status;
        if (parsedData.meds && parsedData.meds.trim()) next.meds = parsedData.meds.trim();
        if (parsedData.hist && parsedData.hist.trim()) next.hist = parsedData.hist.trim();
        if (parsedData.risk && parsedData.risk.trim()) next.risk = parsedData.risk.trim();
        return next;
      });

      setIsAnalyzing(false);
      const displayName = parsedData.name || file.name;
      const displayDept = parsedData.dept || 'General';
      setAnalysisMsg(`✓ Analyzed: ${displayName} categorized into ${displayDept} (${parsedData.status?.toUpperCase() || 'STABLE'})`);
    };

    if (isBinaryOrPdf) {
      reader.readAsDataURL(file);
    } else {
      reader.readAsText(file);
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
              <b>{files.a ? `✓ ${fileNames.a || 'Patient details file added'}` : 'Patient details file'}</b>
              <span>Upload any .txt, .pdf, .json, .csv, or medical note</span>
            </label>

            <label className={`drop ${files.b ? 'ok' : ''}`}>
              <input
                type="file"
                onChange={(e) => handleFileUpload('b', e)}
              />
              <b>{files.b ? `✓ ${fileNames.b || 'Medical description file added'}` : 'Medical description file'}</b>
              <span>Discharge summary, prescription, or clinical note</span>
            </label>

            {isAnalyzing ? (
              <p style={{ color: 'var(--accent)', fontWeight: 600, marginBottom: '14px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="live-pulse"></span> {analysisMsg}
              </p>
            ) : analysisMsg ? (
              <p style={{ color: 'var(--green)', fontWeight: 600, marginBottom: '14px', fontSize: '14px' }}>
                {analysisMsg}
              </p>
            ) : null}
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
