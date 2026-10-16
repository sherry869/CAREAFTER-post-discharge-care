import React from 'react';

export default function Navbar({
  currentView,
  isFlaggedFilter,
  onGoHome,
  onOpenAdd,
  onToggleFlagged,
  onOpenMessages,
  onToggleTheme,
  onSignOut
}) {
  return (
    <nav className="rail" aria-label="Main Navigation">
      <div className="logo">
        <i>+</i>
      </div>

      <button
        className={`nav ${currentView === 'dash' && !isFlaggedFilter ? 'on' : ''}`}
        onClick={onGoHome}
        title="Patients Dashboard"
        aria-label="Patients Dashboard"
      >
        ⌂
      </button>

      <button
        className={`nav ${currentView === 'messages' ? 'on' : ''}`}
        onClick={onOpenMessages}
        title="Patient Messages"
        aria-label="Patient Messages"
      >
        💬
      </button>

      <button
        className="nav"
        onClick={onOpenAdd}
        title="Add patient"
        aria-label="Add patient"
      >
        ＋
      </button>

      <button
        className={`nav ${currentView === 'dash' && isFlaggedFilter ? 'on' : ''}`}
        onClick={onToggleFlagged}
        title="Flagged patients"
        aria-label="Flagged patients"
      >
        ⚑
      </button>

      <div className="spacer"></div>

      <button
        className="nav"
        onClick={onToggleTheme}
        title="Switch theme"
        aria-label="Switch theme"
      >
        ◐
      </button>

      <button
        className="nav"
        onClick={onSignOut}
        title="Sign out"
        aria-label="Sign out"
      >
        ⏻
      </button>
    </nav>
  );
}
