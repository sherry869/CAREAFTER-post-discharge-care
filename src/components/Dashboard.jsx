import React from 'react';
import { DEPARTMENTS, getPatientStatus, STATUS_CONFIG, STATUS_LIST } from '../data/mockPatients';

export default function Dashboard({
  patients = [],
  currentDept = 'All',
  isFlaggedFilter = false,
  statusFilter = null,
  onSelectDept,
  onToggleFlaggedFilter,
  onSelectStatusFilter,
  onSelectPatient,
  onOpenAdd
}) {
  // Compute counts for all 4 clinical triage statuses
  const redCount = patients.filter(p => getPatientStatus(p).key === 'red').length;
  const amberCount = patients.filter(p => getPatientStatus(p).key === 'amber').length;
  const blueCount = patients.filter(p => getPatientStatus(p).key === 'blue').length;
  const greenCount = patients.filter(p => getPatientStatus(p).key === 'green').length;

  const currentStatusFilter = statusFilter || (isFlaggedFilter ? 'red' : null);

  const filteredList = patients.filter(p => {
    const matchesDept = currentDept === 'All' || p.dept === currentDept;
    const pStatus = getPatientStatus(p).key;
    const matchesStatus = !currentStatusFilter || pStatus === currentStatusFilter;
    return matchesDept && matchesStatus;
  });

  const urgentList = patients.filter(p => {
    const k = getPatientStatus(p).key;
    return k === 'red' || k === 'amber';
  });

  const handleStatClick = (statusKey) => {
    if (onSelectStatusFilter) {
      onSelectStatusFilter(statusKey);
    } else if (onToggleFlaggedFilter) {
      onToggleFlaggedFilter(statusKey === 'red');
    }
  };

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

        {/* 5-Card Stats Summary Grid (All, Needs Care, Under Observation, Follow-Up Due, Stable) */}
        <div className="stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
          <button
            className={`stat mint ${!currentStatusFilter ? 'sel' : ''}`}
            onClick={() => handleStatClick(null)}
            title="View all patients"
          >
            <div>
              <span>Total patients</span>
              <b>{patients.length}</b>
              <small>Active follow-up</small>
            </div>
          </button>

          <button
            className={`stat pink ${currentStatusFilter === 'red' ? 'sel' : ''}`}
            onClick={() => handleStatClick('red')}
            title="Filter by Needs Care (Red)"
          >
            <div>
              <span>Needs Care</span>
              <b style={{ color: 'var(--rose-solid)' }}>{redCount}</b>
              <small>Urgent attention</small>
            </div>
          </button>

          <button
            className={`stat amber ${currentStatusFilter === 'amber' ? 'sel' : ''}`}
            onClick={() => handleStatClick('amber')}
            title="Filter by Under Observation (Amber)"
          >
            <div>
              <span>Observation</span>
              <b style={{ color: 'var(--amber-solid)' }}>{amberCount}</b>
              <small>Close watch</small>
            </div>
          </button>

          <button
            className={`stat blue ${currentStatusFilter === 'blue' ? 'sel' : ''}`}
            onClick={() => handleStatClick('blue')}
            title="Filter by Follow-Up Due (Blue)"
          >
            <div>
              <span>Follow-Up Due</span>
              <b style={{ color: 'var(--blue-solid)' }}>{blueCount}</b>
              <small>Check-in pending</small>
            </div>
          </button>

          <button
            className={`stat green ${currentStatusFilter === 'green' ? 'sel' : ''}`}
            onClick={() => handleStatClick('green')}
            title="Filter by Stable (Green)"
          >
            <div>
              <span>Stable</span>
              <b style={{ color: 'var(--emerald-solid)' }}>{greenCount}</b>
              <small>Recovery on track</small>
            </div>
          </button>
        </div>

        {/* Department Chips */}
        <div className="chips">
          {['All', ...DEPARTMENTS].map(dept => (
            <button
              key={dept}
              className={`chip ${currentDept === dept && !currentStatusFilter ? 'on' : ''}`}
              onClick={() => onSelectDept(dept)}
            >
              {dept}
            </button>
          ))}
        </div>

        {/* Department Cards Grid (Visible when All selected and no status filter) */}
        {currentDept === 'All' && !currentStatusFilter && (
          <div className="depts">
            {DEPARTMENTS.map((dept, index) => {
              const deptPatients = patients.filter(p => p.dept === dept);
              const flaggedInDept = deptPatients.filter(p => getPatientStatus(p).key === 'red').length;
              const obsInDept = deptPatients.filter(p => getPatientStatus(p).key === 'amber').length;
              return (
                <button
                  key={dept}
                  className={`dept c${index % 4}`}
                  onClick={() => onSelectDept(dept)}
                >
                  <b>{dept}</b>
                  <span>
                    {deptPatients.length} patients
                    {flaggedInDept > 0 ? ` • ${flaggedInDept} critical` : obsInDept > 0 ? ` • ${obsInDept} obs` : ''}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Section Header */}
        <div className="sec-h">
          <div>
            <h2>
              {currentStatusFilter
                ? `${STATUS_CONFIG[currentStatusFilter]?.label || 'Filtered'} Patients`
                : currentDept === 'All'
                ? 'All Patients'
                : currentDept}
            </h2>
            {currentStatusFilter && (
              <small style={{ color: 'var(--mute)', fontSize: '13px' }}>
                Showing only patients marked as {STATUS_CONFIG[currentStatusFilter]?.label} •{' '}
                <a
                  href="#clear"
                  onClick={(e) => {
                    e.preventDefault();
                    handleStatClick(null);
                  }}
                  style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'underline' }}
                >
                  Show all
                </a>
              </small>
            )}
          </div>
          <span className={`pill ${currentStatusFilter ? STATUS_CONFIG[currentStatusFilter]?.pillClass : ''}`}>
            {filteredList.length} shown
          </span>
        </div>

        {/* Patient Rows */}
        {filteredList.length > 0 ? (
          filteredList.map(p => {
            const status = getPatientStatus(p);
            return (
              <button
                key={p.id}
                className={`row ${status.key}`}
                onClick={() => onSelectPatient(p.id)}
              >
                <span className="dot"></span>
                <div>
                  <div className="n">{p.name}</div>
                  <div className="m">{p.age} yrs • {p.dx}</div>
                </div>
                <div className="m m2">{p.dept}</div>
                <div className="m m2">{p.phone}</div>
                <span className={`pill ${status.pillClass}`}>
                  {status.label}
                </span>
              </button>
            );
          })
        ) : (
          <div className="empty">
            No patients found matching this filter.{' '}
            {currentStatusFilter && (
              <button
                className="btn sm ghost"
                style={{ marginLeft: '10px' }}
                onClick={() => handleStatClick(null)}
              >
                Clear filter
              </button>
            )}
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

        <h3>Needs clinical attention</h3>
        {urgentList.length > 0 ? (
          urgentList.map(p => {
            const status = getPatientStatus(p);
            const urgentQuestion = p.today?.find(t => ['Severe', 'No-bad', 'Severe pain', 'Worse'].includes(t.a));
            return (
              <button
                key={p.id}
                className="alert"
                style={{
                  borderLeft: `4px solid ${status.color}`,
                  marginBottom: '10px',
                  display: 'block',
                  width: '100%',
                  textAlign: 'left'
                }}
                onClick={() => onSelectPatient(p.id)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <b>{p.name}</b>
                  <span className={`pill ${status.pillClass}`} style={{ fontSize: '10px', padding: '2px 7px' }}>
                    {status.label}
                  </span>
                </div>
                <small style={{ display: 'block', marginTop: '4px' }}>
                  {urgentQuestion?.q || p.dx} • Day {p.day_post_discharge || p.day || 1}
                </small>
              </button>
            );
          })
        ) : (
          <p style={{ color: 'var(--mute)' }}>All patients are currently stable.</p>
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
