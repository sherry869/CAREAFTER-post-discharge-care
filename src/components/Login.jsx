import React, { useState } from 'react';

function normalizePhone(str) {
  return (str || '').replace(/\D/g, '');
}

function findPatientByPhone(input, patientList = []) {
  const cleanInput = normalizePhone(input);
  if (cleanInput.length < 5) return null;
  return patientList.find(p => {
    const cleanPatientPhone = normalizePhone(p.phone);
    return cleanPatientPhone.endsWith(cleanInput) || cleanInput.endsWith(cleanPatientPhone);
  });
}

export default function Login({ patients = [], onLogin, onToast }) {
  const [step, setStep] = useState('credentials'); // 'credentials' | 'otp'
  const [identifier, setIdentifier] = useState('citygeneral');
  const [password, setPassword] = useState('demo1234');
  const [otp, setOtp] = useState('');
  const [matchedPatient, setMatchedPatient] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleCredentialsSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    const trimmedId = identifier.trim();

    // 1. Check for Admin Login: "citygeneral" (case-insensitive)
    if (trimmedId.toLowerCase() === 'citygeneral') {
      if (!password.trim()) {
        setErrorMsg('Please enter a password for hospital staff login.');
        setLoading(false);
        return;
      }
      onLogin({
        role: 'admin',
        name: 'City General Hospital',
        department: 'Post-Discharge Care Unit',
        username: trimmedId
      });
      onToast('Signed in as Hospital Admin');
      setLoading(false);
      return;
    }

    // 2. Check for Patient Phone Login matching existing patient record
    const found = findPatientByPhone(trimmedId, patients);
    if (found) {
      setMatchedPatient(found);
      setStep('otp');
      setOtp('');
      setErrorMsg('');
      setLoading(false);
      return;
    }

    // 3. Reject unknown phone number or unknown username
    const digitsOnly = normalizePhone(trimmedId);
    if (digitsOnly.length >= 5) {
      setErrorMsg('Phone number not found in patient records. Please contact City General Hospital.');
    } else {
      setErrorMsg("Use 'citygeneral' for hospital staff or enter a registered patient phone number.");
    }
    setLoading(false);
  };

  const handleOtpSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (otp.trim().length !== 4) {
      setErrorMsg('Please enter a 4-digit code (e.g. 1234).');
      return;
    }

    // Accept any 4 digits for this demo
    onLogin({
      role: 'patient',
      patient: matchedPatient
    });
    onToast(`Welcome, ${matchedPatient.name}`);
  };

  const handleBackToLogin = () => {
    setStep('credentials');
    setMatchedPatient(null);
    setOtp('');
    setErrorMsg('');
  };

  return (
    <section className="login">
      {step === 'credentials' ? (
        <form className="login-card" onSubmit={handleCredentialsSubmit}>
          <div className="logo">
            <i>+</i>
            <span>CareAfter</span>
          </div>
          <h1>Sign in</h1>
          <p>Hospital staff and patient sign-in portal.</p>

          {errorMsg && (
            <div style={{
              background: 'var(--redbg)',
              color: 'var(--red)',
              padding: '10px 14px',
              borderRadius: '12px',
              marginBottom: '14px',
              fontSize: '13px'
            }}>
              {errorMsg}
            </div>
          )}

          <label htmlFor="u">Username (Admin) or Phone Number (Patient)</label>
          <input
            id="u"
            autoComplete="username"
            placeholder="e.g. citygeneral or +91 98470 11223"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
          />

          <label htmlFor="p">Password (Hospital staff only)</label>
          <input
            id="p"
            type="password"
            autoComplete="current-password"
            placeholder="Required for staff; optional for patients"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button className="btn full" type="submit" disabled={loading}>
            {loading ? 'Verifying...' : 'Sign in'}
          </button>

          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--line)', fontSize: '12px', color: 'var(--mute)' }}>
            <span style={{ display: 'block', fontWeight: 600, marginBottom: '6px' }}>Quick Demo Presets:</span>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="chip on"
                style={{ fontSize: '11px', padding: '4px 8px' }}
                onClick={() => {
                  setIdentifier('citygeneral');
                  setPassword('admin123');
                  setErrorMsg('');
                }}
              >
                Staff (citygeneral)
              </button>
              <button
                type="button"
                className="chip"
                style={{ fontSize: '11px', padding: '4px 8px' }}
                onClick={() => {
                  setIdentifier('98470 11223');
                  setPassword('');
                  setErrorMsg('');
                }}
              >
                Patient: Meera Nair
              </button>
              <button
                type="button"
                className="chip"
                style={{ fontSize: '11px', padding: '4px 8px' }}
                onClick={() => {
                  setIdentifier('94470 55120');
                  setPassword('');
                  setErrorMsg('');
                }}
              >
                Patient: Arjun Menon
              </button>
            </div>
          </div>
        </form>
      ) : (
        /* OTP Verification Screen for Patient */
        <form className="login-card" onSubmit={handleOtpSubmit}>
          <div className="logo">
            <i>+</i>
            <span>CareAfter</span>
          </div>
          <h1>Patient Verification</h1>
          <p>
            Welcome, <strong>{matchedPatient?.name}</strong>.<br />
            Enter any 4-digit code to access your recovery chat.
          </p>

          {errorMsg && (
            <div style={{
              background: 'var(--redbg)',
              color: 'var(--red)',
              padding: '10px 14px',
              borderRadius: '12px',
              marginBottom: '14px',
              fontSize: '13px'
            }}>
              {errorMsg}
            </div>
          )}

          <div style={{
            background: 'var(--surface)',
            border: '1.5px solid var(--line)',
            borderRadius: '14px',
            padding: '12px 14px',
            marginBottom: '16px',
            fontSize: '13px',
            color: 'var(--mute)'
          }}>
            Phone: <strong>{matchedPatient?.phone}</strong><br />
            Condition: <strong>{matchedPatient?.dx}</strong> ({matchedPatient?.dept})
          </div>

          <label htmlFor="otp">4-Digit Verification Code</label>
          <input
            id="otp"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            placeholder="e.g. 1234"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
            autoFocus
            style={{
              fontSize: '22px',
              letterSpacing: '8px',
              textAlign: 'center',
              fontWeight: 700
            }}
            required
          />

          <button className="btn full" type="submit">
            Enter Care Chat
          </button>

          <button
            type="button"
            className="btn ghost full"
            style={{ marginTop: '10px' }}
            onClick={handleBackToLogin}
          >
            ← Back to login screen
          </button>
        </form>
      )}
    </section>
  );
}
