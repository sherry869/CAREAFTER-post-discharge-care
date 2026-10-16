import { createClient } from '@supabase/supabase-js';
import { INITIAL_PATIENTS } from '../data/mockPatients';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith('http') &&
  !supabaseUrl.includes('your-project-id')
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// LocalStorage helpers for fallback / zero-config hackathon demo mode
const STORAGE_KEY = 'careafter_patients_v1';
const CHAT_STORAGE_KEY = 'careafter_chats_v1';

function getLocalPatients() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // Fallback
    }
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_PATIENTS));
  return INITIAL_PATIENTS;
}

function saveLocalPatients(patients) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(patients));
}

function getLocalChats(patientId) {
  const saved = localStorage.getItem(`${CHAT_STORAGE_KEY}_${patientId}`);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // Fallback
    }
  }
  // Default seed messages for demonstration
  const defaultMsgs = [
    {
      id: 1,
      sender: 'hospital',
      text: 'Good morning! This is CareAfter daily follow-up from City General Hospital. How are you feeling today?',
      created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
      status: 'read'
    },
    {
      id: 2,
      sender: 'patient',
      text: 'Good morning nurse. Overall okay, but wanted to confirm about taking my medicines after breakfast.',
      created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
      status: 'read'
    }
  ];
  localStorage.setItem(`${CHAT_STORAGE_KEY}_${patientId}`, JSON.stringify(defaultMsgs));
  return defaultMsgs;
}

function saveLocalChats(patientId, msgs) {
  localStorage.setItem(`${CHAT_STORAGE_KEY}_${patientId}`, JSON.stringify(msgs));
}

// ==========================================
// Patient Service Methods
// ==========================================

export async function getPatients() {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select(`
          *,
          follow_up_questions(*)
        `)
        .order('id', { ascending: false });

      if (!error && data && data.length > 0) {
        // Transform database rows to match app state model
        return data.map(p => ({
          id: p.id,
          name: p.name,
          age: p.age,
          dept: p.dept,
          dx: p.dx,
          phone: p.phone,
          day: p.day_post_discharge || 1,
          day_post_discharge: p.day_post_discharge || 1,
          red: p.is_flagged,
          is_flagged: p.is_flagged,
          meds: p.medications || '',
          medications: p.medications || '',
          hist: p.medical_history || '',
          medical_history: p.medical_history || '',
          risk: p.risk_factors || '',
          risk_factors: p.risk_factors || '',
          today: (p.follow_up_questions || [])
            .filter(q => q.is_today)
            .map(q => ({ q: q.question_text, a: q.reply_text || '' })),
          history: (p.follow_up_questions || [])
            .filter(q => !q.is_today)
            .reduce((acc, q) => {
              const dayKey = `Day ${q.day_number || 1}`;
              let group = acc.find(g => g.d === dayKey);
              if (!group) {
                group = { d: dayKey, l: [] };
                acc.push(group);
              }
              group.l.push([q.question_text, q.reply_text || 'Pending']);
              return acc;
            }, []),
          sug: Array.isArray(p.ai_suggestions) ? p.ai_suggestions : []
        }));
      }
    } catch (err) {
      console.warn('Supabase fetch failed, falling back to local persistent store:', err);
    }
  }

  return getLocalPatients();
}

export async function createPatient(patientData) {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('patients')
        .insert([
          {
            name: patientData.name,
            age: Number(patientData.age) || 0,
            dept: patientData.dept,
            dx: patientData.dx,
            phone: patientData.phone,
            day_post_discharge: 1,
            is_flagged: false,
            medications: patientData.meds || '',
            medical_history: patientData.hist || '',
            risk_factors: patientData.risk || '',
            ai_suggestions: ['AI will suggest actions after first follow-up reply'],
            is_demo: true
          }
        ])
        .select()
        .single();

      if (!error && data) {
        // Insert initial question
        await supabase.from('follow_up_questions').insert([
          {
            patient_id: data.id,
            question_text: 'Welcome. How are you feeling today?',
            reply_text: null,
            day_number: 1,
            is_today: true
          }
        ]);
        return await getPatients();
      }
    } catch (err) {
      console.warn('Supabase create failed, using local store:', err);
    }
  }

  // Fallback to local
  const current = getLocalPatients();
  const newPatient = {
    ...patientData,
    id: Date.now(),
    day: 1,
    day_post_discharge: 1,
    red: false,
    is_flagged: false,
    today: [{ q: 'Welcome. How are you feeling today?', a: '' }],
    history: [],
    sug: ['AI will suggest actions after first follow-up reply']
  };
  const updated = [newPatient, ...current];
  saveLocalPatients(updated);
  return updated;
}

export async function updatePatient(id, updates) {
  if (isSupabaseConfigured && supabase) {
    try {
      const dbPayload = {};
      if (updates.name !== undefined) dbPayload.name = updates.name;
      if (updates.age !== undefined) dbPayload.age = Number(updates.age);
      if (updates.dept !== undefined) dbPayload.dept = updates.dept;
      if (updates.dx !== undefined) dbPayload.dx = updates.dx;
      if (updates.phone !== undefined) dbPayload.phone = updates.phone;
      if (updates.meds !== undefined) dbPayload.medications = updates.meds;
      if (updates.hist !== undefined) dbPayload.medical_history = updates.hist;
      if (updates.risk !== undefined) dbPayload.risk_factors = updates.risk;
      if (updates.red !== undefined) dbPayload.is_flagged = updates.red;
      if (updates.sug !== undefined) dbPayload.ai_suggestions = updates.sug;

      const { error } = await supabase
        .from('patients')
        .update(dbPayload)
        .eq('id', id);

      if (!error) {
        return await getPatients();
      }
    } catch (err) {
      console.warn('Supabase update failed, using local store:', err);
    }
  }

  const current = getLocalPatients();
  const updated = current.map(p => (p.id === id ? { ...p, ...updates } : p));
  saveLocalPatients(updated);
  return updated;
}

export async function deletePatient(id) {
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase.from('patients').delete().eq('id', id);
      if (!error) {
        return await getPatients();
      }
    } catch (err) {
      console.warn('Supabase delete failed, using local store:', err);
    }
  }

  const current = getLocalPatients();
  const updated = current.filter(p => p.id !== id);
  saveLocalPatients(updated);
  return updated;
}

export async function addQuestion(patientId, questionText) {
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase.from('follow_up_questions').insert([
        {
          patient_id: patientId,
          question_text: questionText,
          reply_text: null,
          is_today: true
        }
      ]);
      if (!error) {
        return await getPatients();
      }
    } catch (err) {
      console.warn('Supabase add question failed, using local store:', err);
    }
  }

  const current = getLocalPatients();
  const updated = current.map(p => {
    if (p.id === patientId) {
      return {
        ...p,
        today: [...(p.today || []), { q: questionText, a: '' }]
      };
    }
    return p;
  });
  saveLocalPatients(updated);
  return updated;
}

// ==========================================
// WhatsApp Simulator Chat Messages Service
// ==========================================

export async function getChatMessages(patientId) {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: true });

      if (!error && data && data.length > 0) {
        return data;
      }
    } catch (err) {
      console.warn('Supabase get chats failed, using local store:', err);
    }
  }

  return getLocalChats(patientId);
}

export async function sendChatMessage(patientId, sender, text) {
  const newMsg = {
    patient_id: patientId,
    sender,
    text,
    status: 'delivered',
    created_at: new Date().toISOString()
  };

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert([newMsg])
        .select()
        .single();

      if (!error && data) {
        return data;
      }
    } catch (err) {
      console.warn('Supabase send chat failed, using local store:', err);
    }
  }

  const current = getLocalChats(patientId);
  const updated = [...current, { ...newMsg, id: Date.now() }];
  saveLocalChats(patientId, updated);
  return newMsg;
}
