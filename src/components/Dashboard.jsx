import React from 'react';
import { DEPARTMENTS } from '../data/mockPatients';

export default function Dashboard({
  patients,
  currentDept,
  isFlaggedFilter,
  onSelectDept,
  onToggleFlaggedFilter,
  onSelectPatient,
  onOpenAdd
}) {
  const flaggedCount = patients.filter(p => p.red || p.is_flagged).length;
  const filteredList = patients.filter(p => {
    const matchesDept = currentDept === 'All' || p.dept === currentDept;
    const matchesFlag = !isFlaggedFilter || (p.red || p.is_flagged);
    return matchesDept && matchesFlag;
  });

  const flaggedList = patients.filter(p => p.red || p.is_flagged);

  return (
    <>
      <main>
        {/* Pure CSS Gradient Hero Section with Electric Blue Aura Glow */}
        <div className="hero-container">
          <div className="hero-content">
            <div>
              <div className="hero-badge">POST-DISCHARGE PATIENT TELEMETRY</div>
              <h1 className="hero-title">Good morning, City General</h1>
              <p className="hero-subtitle">
                Patient replies, symptom alerts, and recovery trajectories arrive here in real time.
              </p>
            </div>
            <button className="btn btn-hero" onClick={onOpenAdd}>
              ＋ Add Patient
            </button>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="stats">
          <button
            className={`stat mint ${!isFlaggedFilter ? 'sel' : ''}`}
            onClick={() => onToggleFlaggedFilter(false)}
          >
            <div>
              <span>Total patients</span>
              <b>{patients.length}</b>
              <small>Under active follow-up</small>
            </div>
          </button>

          <button
            className={`stat pink ${isFlaggedFilter ? 'sel' : ''}`}
            onClick={() => onToggleFlaggedFilter(true)}
          >
            <div>
              <span>Flagged patients</span>
              <b>{flaggedCount}</b>
              <small>Important care needed</small>
            </div>
          </button>
        </div>

        {/* Department Chips */}
        <div className="chips">
          {['All', ...DEPARTMENTS].map(dept => (
            <button
              key={dept}
              className={`chip ${currentDept === dept && !isFlaggedFilter ? 'on' : ''}`}
              onClick={() => onSelectDept(dept)}
            >
              {dept}
            </button>
          ))}
        </div>

        {/* Department Cards Grid (Visible when All selected and not flagged) */}
        {currentDept === 'All' && !isFlaggedFilter && (
          <div className="depts">
            {DEPARTMENTS.map((dept, index) => {
              const deptPatients = patients.filter(p => p.dept === dept);
              const flaggedInDept = deptPatients.filter(p => p.red || p.is_flagged).length;
              return (
                <button
                  key={dept}
                  className={`dept c${index % 4}`}
                  onClick={() => onSelectDept(dept)}
                >
                  <b>{dept}</b>
                  <span>
                    {deptPatients.length} patients
                    {flaggedInDept > 0 ? ` • ${flaggedInDept} flagged` : ''}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Section Header */}
        <div className="sec-h">
          <h2>
            {isFlaggedFilter
              ? 'Flagged patients'
              : currentDept === 'All'
              ? 'All patients'
              : currentDept}
          </h2>
          <span className={`pill ${isFlaggedFilter ? 'red' : ''}`}>
            {filteredList.length} shown
          </span>
        </div>

        {/* Patient Rows */}
        {filteredList.length > 0 ? (
          filteredList.map(p => {
            const isRed = p.red || p.is_flagged;
            return (
              <button
                key={p.id}
                className={`row ${isRed ? 'red' : ''}`}
                onClick={() => onSelectPatient(p.id)}
              >
                <span className="dot"></span>
                <div>
                  <div className="n">{p.name}</div>
                  <div className="m">{p.age} yrs • {p.dx}</div>
                </div>
                <div className="m m2">{p.dept}</div>
                <div className="m m2">{p.phone}</div>
                <span className={`pill ${isRed ? 'red' : ''}`}>
                  {isRed ? 'Needs care' : 'Stable'}
                </span>
              </button>
            );
          })
        ) : (
          <div className="empty">
            No patients found matching this filter. Add a patient to start follow-up.
          </div>
        )}
      </main>

      {/* Right Sidebar Rail */}
      <aside>
        <div className="me">
          <div className="av">CG</div>
          <div>
            <b>City General Hospital</b>
            <small>Post-Discharge Follow-Up Admin</small>
          </div>
        </div>

        <h3>Needs a call now</h3>
        {flaggedList.length > 0 ? (
          flaggedList.map(p => {
            const urgentQuestion = p.today?.find(t => ['Severe', 'No-bad', 'Severe pain'].includes(t.a));
            return (
              <button
                key={p.id}
                className="alert"
                onClick={() => onSelectPatient(p.id)}
              >
                <b>{p.name}</b>
                <small>{urgentQuestion?.q || p.dx}</small>
              </button>
            );
          })
        ) : (
          <p style={{ color: 'var(--mute)' }}>No flagged patients right now.</p>
        )}

        <h3>Replies this week</h3>
        <div className="bars">
          {[42, 58, 51, 66, 74, 60, 82].map((height, i) => (
            <i key={i} style={{ height: `${height}%` }}></i>
          ))}
        </div>
        <div className="bars-l">
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span>Sat</span>
          <span>Sun</span>
        </div>
      </aside>
    </>
  );
}
