import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import PatientDetail from './components/PatientDetail';
import PatientChatView from './components/PatientChatView';
import AdminMessages from './components/AdminMessages';
import AddPatientModal from './components/AddPatientModal';
import EditPatientModal from './components/EditPatientModal';
import WhatsAppSimulator from './components/WhatsAppSimulator';
import GeminiModal from './components/GeminiModal';
import PatientReportModal from './components/PatientReportModal';
import { STATUS_CONFIG } from './data/mockPatients';
import {
  isSupabaseConfigured,
  getPatients,
  createPatient,
  updatePatient,
  deletePatient,
  addQuestion
} from './lib/supabase';

export default function App() {
  // Session persistence across page reloads & browser refresh (using sessionStorage so multiple tabs don't conflict)
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = sessionStorage.getItem('careafter_user_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  const [view, setView] = useState(() => {
    try {
      return sessionStorage.getItem('careafter_view') || 'dash';
    } catch {
      return 'dash';
    }
  });

  const [selectedPatientId, setSelectedPatientId] = useState(() => {
    try {
      const saved = sessionStorage.getItem('careafter_selected_patient_id');
      return saved ? (isNaN(Number(saved)) ? saved : Number(saved)) : null;
    } catch {
      return null;
    }
  });

  const [currentDept, setCurrentDept] = useState('All');
  const [statusFilter, setStatusFilter] = useState(null); // null | 'red' | 'amber' | 'blue' | 'green'

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [showGeminiModal, setShowGeminiModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  // Toast
  const [toastMessage, setToastMessage] = useState('');

  // Persist auth session on change per tab
  useEffect(() => {
    if (currentUser) {
      sessionStorage.setItem('careafter_user_session', JSON.stringify(currentUser));
    } else {
      sessionStorage.removeItem('careafter_user_session');
    }
  }, [currentUser]);

  // Persist current view on change per tab
  useEffect(() => {
    sessionStorage.setItem('careafter_view', view);
  }, [view]);

  // Persist selected patient on change per tab
  useEffect(() => {
    if (selectedPatientId) {
      sessionStorage.setItem('careafter_selected_patient_id', String(selectedPatientId));
    }
  }, [selectedPatientId]);

  // Initial Data Load & recurring background refresh for patient records
  useEffect(() => {
    async function init() {
      setLoading(true);
      const data = await getPatients();
      setPatients(data);
      if (data && data.length > 0 && !selectedPatientId) {
        setSelectedPatientId(data[0].id);
      }
      setLoading(false);
    }
    init();

    // Auto refresh patient records every 4 seconds to sync replies across tabs & devices
    const interval = setInterval(async () => {
      const data = await getPatients();
      if (data && data.length > 0) {
        setPatients(data);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage('');
    }, 2800);
  };

  const handleToggleTheme = () => {
    const root = document.documentElement;
    const isDark = root.dataset.theme
      ? root.dataset.theme === 'dark'
      : window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = isDark ? 'light' : 'dark';
    showToast(isDark ? 'Light theme activated' : 'Dark theme activated');
  };

  // CRUD Actions
  const handleSaveNewPatient = async (formData) => {
    const updated = await createPatient(formData);
    setPatients(updated);
    setShowAddModal(false);
    setView('dash');
    setStatusFilter(null);
    setCurrentDept('All');
    showToast('Patient admitted and follow-up queued');
  };

  const handleSaveEditPatient = async (id, formData) => {
    const updated = await updatePatient(id, formData);
    setPatients(updated);
    setShowEditModal(false);
    showToast('Patient details updated');
  };

  // 4-Tier Status setting
  const handleSetStatus = async (id, newStatus) => {
    const updated = await updatePatient(id, {
      status: newStatus,
      red: newStatus === 'red',
      is_flagged: newStatus !== 'green'
    });
    setPatients(updated);
    const label = STATUS_CONFIG[newStatus]?.label || newStatus;
    showToast(`Patient status updated: ${label}`);
  };

  const handleToggleFlag = async (id, currentFlag) => {
    let nextStatus = 'green';
    if (typeof currentFlag === 'string') {
      nextStatus = currentFlag === 'red' ? 'green' : 'red';
    } else {
      nextStatus = !currentFlag ? 'red' : 'green';
    }
    await handleSetStatus(id, nextStatus);
  };

  const handleFlagPatientFromChat = async (patientId, reason) => {
    await handleSetStatus(patientId, 'red');
    showToast(`⚠️ Patient flagged for clinical review: ${reason}`);
  };

  const handleDeletePatient = async (id, name) => {
    if (window.confirm(`Remove ${name} from CareAfter? Their follow-up will stop.`)) {
      const updated = await deletePatient(id);
      setPatients(updated);
      setView('dash');
      showToast('Patient removed');
    }
  };

  const handleAddQuestionToPatient = async (patientId, questionText) => {
    const updated = await addQuestion(patientId, questionText);
    setPatients(updated);
  };

  const handleUpdateSuggestions = async (suggestions) => {
    if (!selectedPatientId) return;
    const updated = await updatePatient(selectedPatientId, { sug: suggestions });
    setPatients(updated);
  };

  const selectedPatient = patients.find(p => p.id === selectedPatientId) || patients[0];

  // 1. Shared Login Screen (when not logged in)
  if (!currentUser) {
    return (
      <Login
        patients={patients}
        onLogin={(user) => {
          setCurrentUser(user);
          if (user.role === 'patient') {
            setSelectedPatientId(user.patient.id);
          }
        }}
        onToast={showToast}
      />
    );
  }

  // 2. Patient Experience — Clean, mobile-friendly chat screen ONLY with persistent per-tab session
  if (currentUser.role === 'patient') {
    return (
      <>
        <PatientChatView
          patient={currentUser.patient}
          onSignOut={() => {
            setCurrentUser(null);
            showToast('Signed out of patient portal');
          }}
          onPatientFlagged={handleFlagPatientFromChat}
        />
        {toastMessage && <div className="toast">{toastMessage}</div>}
      </>
    );
  }

  // 3. Admin Experience — Preserved dashboard with live Messages section
  return (
    <>
      <div className="shell">
        <Navbar
          currentView={view}
          isFlaggedFilter={Boolean(statusFilter)}
          onGoHome={() => {
            setView('dash');
            setStatusFilter(null);
            setCurrentDept('All');
          }}
          onOpenMessages={() => {
            setView('messages');
          }}
          onOpenAdd={() => setShowAddModal(true)}
          onToggleFlagged={() => {
            setView('dash');
            setStatusFilter(prev => (prev ? null : 'red'));
            setCurrentDept('All');
          }}
          onToggleTheme={handleToggleTheme}
          onSignOut={() => {
            setCurrentUser(null);
            showToast('Signed out of hospital admin');
          }}
        />

        {view === 'dash' && (
          <Dashboard
            patients={patients}
            currentDept={currentDept}
            statusFilter={statusFilter}
            isFlaggedFilter={statusFilter === 'red'}
            onSelectDept={(dept) => {
              setCurrentDept(dept);
            }}
            onSelectStatusFilter={(statusKey) => {
              setStatusFilter(statusKey);
            }}
            onToggleFlaggedFilter={(flagged) => {
              setStatusFilter(flagged ? 'red' : null);
            }}
            onSelectPatient={(id) => {
              setSelectedPatientId(id);
              setView('detail');
              window.scrollTo(0, 0);
            }}
            onOpenAdd={() => setShowAddModal(true)}
          />
        )}

        {view === 'detail' && (
          <main>
            <PatientDetail
              patient={selectedPatient}
              onBack={() => setView('dash')}
              onOpenEdit={() => setShowEditModal(true)}
              onToggleFlag={handleToggleFlag}
              onSetStatus={handleSetStatus}
              onDelete={handleDeletePatient}
              onAddQuestion={handleAddQuestionToPatient}
              onOpenMessages={() => {
                setView('messages');
                window.scrollTo(0, 0);
              }}
              onOpenWhatsApp={() => setShowWhatsAppModal(true)}
              onOpenGemini={() => setShowGeminiModal(true)}
              onOpenReport={() => setShowReportModal(true)}
              onToast={showToast}
            />
          </main>
        )}

        {view === 'messages' && (
          <AdminMessages
            patients={patients}
            selectedPatientId={selectedPatientId}
            onSelectPatient={(id) => setSelectedPatientId(id)}
            onToggleFlag={handleToggleFlag}
            onSetStatus={handleSetStatus}
            onToast={showToast}
          />
        )}
      </div>

      {/* Modals */}
      {showAddModal && (
        <AddPatientModal
          onClose={() => setShowAddModal(false)}
          onSave={handleSaveNewPatient}
        />
      )}

      {showEditModal && selectedPatient && (
        <EditPatientModal
          patient={selectedPatient}
          onClose={() => setShowEditModal(false)}
          onSave={handleSaveEditPatient}
        />
      )}

      {showWhatsAppModal && selectedPatient && (
        <WhatsAppSimulator
          patient={selectedPatient}
          onClose={() => setShowWhatsAppModal(false)}
          onToast={showToast}
        />
      )}

      {showGeminiModal && selectedPatient && (
        <GeminiModal
          patient={selectedPatient}
          onClose={() => setShowGeminiModal(false)}
          onUseQuestion={(q, options) => {
            const fullQ = options && options.length ? `${q} (${options.join(' or ')})` : q;
            handleAddQuestionToPatient(selectedPatient.id, fullQ);
            showToast('Question added to follow-up');
          }}
          onUpdateSuggestions={handleUpdateSuggestions}
          onToast={showToast}
        />
      )}

      {showReportModal && selectedPatient && (
        <PatientReportModal
          patient={selectedPatient}
          onClose={() => setShowReportModal(false)}
          onToast={showToast}
        />
      )}

      {/* Floating Toast Notification */}
      {toastMessage && <div className="toast">{toastMessage}</div>}
    </>
  );
}
