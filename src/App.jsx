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
import {
  isSupabaseConfigured,
  getPatients,
  createPatient,
  updatePatient,
  deletePatient,
  addQuestion
} from './lib/supabase';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null); // null | { role: 'admin' } | { role: 'patient', patient: {...} }
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('dash'); // 'dash' | 'detail' | 'messages'
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [currentDept, setCurrentDept] = useState('All');
  const [isFlaggedFilter, setIsFlaggedFilter] = useState(false);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [showGeminiModal, setShowGeminiModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  // Toast
  const [toastMessage, setToastMessage] = useState('');

  // Initial Data Load
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
    setIsFlaggedFilter(false);
    setCurrentDept('All');
    showToast('Patient admitted and follow-up queued');
  };

  const handleSaveEditPatient = async (id, formData) => {
    const updated = await updatePatient(id, formData);
    setPatients(updated);
    setShowEditModal(false);
    showToast('Patient details updated');
  };

  const handleToggleFlag = async (id, currentFlag) => {
    const updated = await updatePatient(id, { red: !currentFlag, is_flagged: !currentFlag });
    setPatients(updated);
    showToast(!currentFlag ? 'Marked as red (Needs Care)' : 'Marked as green (Stable)');
  };

  const handleFlagPatientFromChat = async (patientId, reason) => {
    const updated = await updatePatient(patientId, { red: true, is_flagged: true });
    setPatients(updated);
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
        onLogin={(user) => setCurrentUser(user)}
        onToast={showToast}
      />
    );
  }

  // 2. Patient Experience — Clean, minimal mobile-friendly chat screen ONLY
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

  // 3. Admin Experience — Preserved dashboard with new Messages section
  return (
    <>
      <div className="shell">
        <Navbar
          currentView={view}
          isFlaggedFilter={isFlaggedFilter}
          onGoHome={() => {
            setView('dash');
            setIsFlaggedFilter(false);
            setCurrentDept('All');
          }}
          onOpenMessages={() => {
            setView('messages');
          }}
          onOpenAdd={() => setShowAddModal(true)}
          onToggleFlagged={() => {
            setView('dash');
            setIsFlaggedFilter(prev => !prev);
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
            isFlaggedFilter={isFlaggedFilter}
            onSelectDept={(dept) => {
              setCurrentDept(dept);
              setIsFlaggedFilter(false);
            }}
            onToggleFlaggedFilter={(flagged) => {
              setIsFlaggedFilter(flagged);
              setCurrentDept('All');
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
