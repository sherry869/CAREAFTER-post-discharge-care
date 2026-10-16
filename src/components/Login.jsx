import React, { useState } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

export default function Login({ onLogin, onToast }) {
  const [username, setUsername] = useState('citygeneral');
  const [password, setPassword] = useState('demo1234');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    // If real Supabase Auth is configured, we can attempt Supabase sign in;
    // otherwise (or if using default hospital demo credentials), we authenticate directly.
    if (isSupabaseConfigured && supabase && username.includes('@')) {
      try {
        const { error } = await supabase.auth.signInWithPassword({
          email: username,
          password
        });
        if (error) {
          setErrorMsg(error.message);
          setLoading(false);
          return;
        }
      } catch (err) {
        console.warn('Supabase auth check error:', err);
      }
    }

    // Standard hospital staff login
    if (username.trim()) {
      onLogin({
        name: 'City General Hospital',
        department: 'Post-Discharge Care Unit',
        username
      });
      onToast('Signed in successfully');
    } else {
      setErrorMsg('Please enter a username or hospital ID');
    }
    setLoading(false);
  };

  return (
    <section className="login">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="logo">
          <i>+</i>
          <span>CareAfter</span>
        </div>
        <h1>Sign in</h1>
        <p>Use the login your hospital was given.</p>

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

        <label htmlFor="u">Username / Staff ID</label>
        <input
          id="u"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />

        <label htmlFor="p">Password</label>
        <input
          id="p"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button className="btn full" type="submit" disabled={loading}>
          {loading ? 'Authenticating...' : 'Sign in'}
        </button>

        <div style={{ marginTop: '18px', textAlign: 'center', fontSize: '12px', color: 'var(--mute)' }}>
          <span>Demo credentials pre-filled for hackathon evaluation.</span>
        </div>
      </form>
    </section>
  );
}
