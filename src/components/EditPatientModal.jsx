import React, { useState } from 'react';
import { DEPARTMENTS } from '../data/mockPatients';

export default function EditPatientModal({ patient, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: patient.name || '',
    age: patient.age || '',
    phone: patient.phone || '',
    dept: patient.dept || 'Cardiology',
    dx: patient.dx || '',
    meds: patient.meds || patient.medications || '',
    hist: patient.hist || patient.medical_history || '',
    risk: patient.risk || patient.risk_factors || ''
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(patient.id, formData);
  };

  return (
    <div className="modal" onClick={(e) => e.target.className === 'modal' && onClose()}>
      <div className="sheet" role="dialog" aria-label="Patient details">
        <h2>{patient.name}</h2>
        <p>Edit the clinical details the AI uses to choose follow-up questions.</p>

        <form onSubmit={handleSubmit}>
          <div className="fg">
            <div>
              <label htmlFor="e_name">Full name</label>
              <input
                id="e_name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                required
              />
            </div>

            <div>
              <label htmlFor="e_age">Age</label>
              <input
                id="e_age"
                type="number"
                value={formData.age}
                onChange={(e) => handleChange('age', e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="e_phone">Contact number</label>
              <input
                id="e_phone"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                required
              />
            </div>

            <div>
              <label htmlFor="e_dept">Department</label>
              <select
                id="e_dept"
                value={formData.dept}
                onChange={(e) => handleChange('dept', e.target.value)}
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div className="w">
              <label htmlFor="e_dx">Diagnosis</label>
              <input
                id="e_dx"
                value={formData.dx}
                onChange={(e) => handleChange('dx', e.target.value)}
              />
            </div>

            <div className="w">
              <label htmlFor="e_meds">Medications</label>
              <input
                id="e_meds"
                value={formData.meds}
                onChange={(e) => handleChange('meds', e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="e_hist">Medical history</label>
              <input
                id="e_hist"
                value={formData.hist}
                onChange={(e) => handleChange('hist', e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="e_risk">Risk factors</label>
              <input
                id="e_risk"
                value={formData.risk}
                onChange={(e) => handleChange('risk', e.target.value)}
              />
            </div>
          </div>

          <div className="acts">
            <button type="button" className="btn ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn">
              Save changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
