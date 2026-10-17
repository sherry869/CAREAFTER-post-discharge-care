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

// LocalStorage helpers for zero-config hackathon demo mode & fast caching
const STORAGE_KEY = 'careafter_patients_v1';
const CHAT_STORAGE_KEY = 'careafter_chats_v1';
const CHAT_EVENT_NAME = 'careafter_chat_event';

// Cross-tab / cross-window broadcast channel for instant multi-screen sync
let chatBroadcastChannel = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    chatBroadcastChannel = new BroadcastChannel('careafter_chat_channel');
  }
} catch {
  // BroadcastChannel fallback handled by storage event
}

export function subscribeToChatUpdates(callback) {
  if (typeof window === 'undefined') return () => {};

  const handleCustomEvent = (e) => {
    if (callback) callback(e.detail);
  };

  const handleStorage = (e) => {
    if (e.key && e.key.startsWith(CHAT_STORAGE_KEY)) {
      const patientId = e.key.replace(`${CHAT_STORAGE_KEY}_`, '');
      if (callback) callback({ patientId, source: 'storage' });
    }
  };

  const handleBroadcast = (e) => {
    if (e.data && callback) callback(e.data);
  };

  window.addEventListener(CHAT_EVENT_NAME, handleCustomEvent);
  window.addEventListener('storage', handleStorage);
  if (chatBroadcastChannel) {
    chatBroadcastChannel.addEventListener('message', handleBroadcast);
  }

  // Also subscribe to Supabase Realtime if configured
  let supabaseChannel = null;
  if (isSupabaseConfigured && supabase) {
    try {
      supabaseChannel = supabase
        .channel('public:chat_messages')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'chat_messages' },
          (payload) => {
            const patientId = payload.new?.patient_id || payload.old?.patient_id;
            if (callback) callback({ patientId, realtime: true, payload });
          }
        )
        .subscribe();
    } catch (e) {
      console.warn('Supabase realtime subscription failed:', e);
    }
  }

  return () => {
    window.removeEventListener(CHAT_EVENT_NAME, handleCustomEvent);
    window.removeEventListener('storage', handleStorage);
    if (chatBroadcastChannel) {
      chatBroadcastChannel.removeEventListener('message', handleBroadcast);
    }
    if (supabaseChannel && supabase) {
      try {
        supabase.removeChannel(supabaseChannel);
      } catch {}
    }
  };
}

export function notifyChatUpdate(patientId, newMsg = null) {
  if (typeof window === 'undefined') return;
  const detail = { patientId: String(patientId), message: newMsg, timestamp: Date.now() };

  // 1. Dispatch custom event for components in the same window
  try {
    window.dispatchEvent(new CustomEvent(CHAT_EVENT_NAME, { detail }));
  } catch {}

  // 2. BroadcastChannel for other tabs/windows
  try {
    if (chatBroadcastChannel) {
      chatBroadcastChannel.postMessage(detail);
    }
  } catch {}
}

function getLocalPatients() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
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

function getLocalChats(patientId, allowSeed = true) {
  const pId = String(patientId);
  const saved = localStorage.getItem(`${CHAT_STORAGE_KEY}_${pId}`);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {
      // Fallback
    }
  }

  if (!allowSeed) return [];

  // Default seed messages for demonstration
  const defaultMsgs = [
    {
      id: 1,
      patient_id: Number(patientId) || 1,
      sender: 'hospital',
      text: 'Good morning! This is CareAfter daily follow-up from City General Hospital. How are you feeling today?',
      created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
      status: 'read'
    },
    {
      id: 2,
      patient_id: Number(patientId) || 1,
      sender: 'patient',
      text: 'Good morning nurse. Overall okay, but wanted to confirm about taking my medicines after breakfast.',
      created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
      status: 'read'
    }
  ];
  localStorage.setItem(`${CHAT_STORAGE_KEY}_${pId}`, JSON.stringify(defaultMsgs));
  return defaultMsgs;
}

function saveLocalChats(patientId, msgs) {
  const pId = String(patientId);
  try {
    localStorage.setItem(`${CHAT_STORAGE_KEY}_${pId}`, JSON.stringify(msgs));
  } catch (err) {
    console.warn('Failed to save chats to localStorage:', err);
  }
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
        // Transform database rows to match app state model with 4-tier status
        return data.map(p => {
          const status = p.status || (p.is_flagged ? 'red' : 'green');
          return {
            id: p.id,
            name: p.name,
            age: p.age,
            dept: p.dept,
            dx: p.dx,
            phone: p.phone,
            day: p.day_post_discharge || 1,
            day_post_discharge: p.day_post_discharge || 1,
            status,
            red: status === 'red' || p.is_flagged,
            is_flagged: status !== 'green' || p.is_flagged,
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
          };
        });
      }
    } catch (err) {
      console.warn('Supabase fetch failed, falling back to local persistent store:', err);
    }
  }

  return getLocalPatients();
}

export async function createPatient(patientData) {
  const initialStatus = patientData.status || (patientData.red ? 'red' : 'green');

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
            status: initialStatus,
            is_flagged: initialStatus !== 'green',
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
    status: initialStatus,
    red: initialStatus === 'red',
    is_flagged: initialStatus !== 'green',
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
      if (updates.sug !== undefined) dbPayload.ai_suggestions = updates.sug;

      if (updates.status !== undefined) {
        dbPayload.status = updates.status;
        dbPayload.is_flagged = updates.status !== 'green';
      } else if (updates.red !== undefined) {
        dbPayload.is_flagged = Boolean(updates.red);
        dbPayload.status = updates.red ? 'red' : 'green';
      }

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
  const updated = current.map(p => {
    if (p.id === id) {
      const merged = { ...p, ...updates };
      if (updates.status !== undefined) {
        merged.status = updates.status;
        merged.red = updates.status === 'red';
        merged.is_flagged = updates.status !== 'green';
      } else if (updates.red !== undefined && updates.status === undefined) {
        merged.status = updates.red ? 'red' : 'green';
        merged.red = Boolean(updates.red);
        merged.is_flagged = Boolean(updates.red);
      }
      return merged;
    }
    return p;
  });
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
      const newToday = [...(p.today || []), { q: questionText, a: '' }];
      return { ...p, today: newToday };
    }
    return p;
  });
  saveLocalPatients(updated);
  return updated;
}

// Automatically update patient follow-up answer when patient replies in chat
export async function answerPatientQuestion(patientId, answerText) {
  if (!patientId || !answerText) return;

  if (isSupabaseConfigured && supabase) {
    try {
      // Find today's latest question with null reply
      const { data: questions } = await supabase
        .from('follow_up_questions')
        .select('id')
        .eq('patient_id', patientId)
        .eq('is_today', true)
        .is('reply_text', null)
        .order('id', { ascending: false })
        .limit(1);

      if (questions && questions.length > 0) {
        await supabase
          .from('follow_up_questions')
          .update({ reply_text: answerText })
          .eq('id', questions[0].id);
      }
    } catch (err) {
      console.warn('Supabase answer question failed:', err);
    }
  }

  // Update local patient store
  const current = getLocalPatients();
  let changed = false;
  const updated = current.map(p => {
    if (String(p.id) === String(patientId) && p.today && p.today.length > 0) {
      const unansweredIdx = p.today.findIndex(q => !q.a || q.a === 'Waiting for reply');
      if (unansweredIdx !== -1) {
        const newToday = [...p.today];
        newToday[unansweredIdx] = { ...newToday[unansweredIdx], a: answerText };
        changed = true;
        return { ...p, today: newToday };
      }
    }
    return p;
  });

  if (changed) {
    saveLocalPatients(updated);
  }
}

// ==========================================
// WhatsApp Simulator & Live Chat Messages Service
// ==========================================

export async function getChatMessages(patientId) {
  if (!patientId) return [];
  const pId = String(patientId);
  const pIdNum = Number(patientId);

  let remoteMessages = [];

  // 1. If Supabase is configured with a real URL, query Supabase
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('patient_id', isNaN(pIdNum) ? pId : pIdNum)
        .order('created_at', { ascending: true });

      if (!error && Array.isArray(data) && data.length > 0) {
        remoteMessages = data;
      }
    } catch (err) {
      console.warn('Supabase get chats failed:', err);
    }
  }

  // 2. Query shared central API route /api/chats (enables sync across phone, laptop, and all browsers)
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch(`/api/chats?patientId=${pId}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          // If remote had no messages, use server API messages
          if (remoteMessages.length === 0) {
            remoteMessages = json.data;
          } else {
            // Merge deduplicated
            json.data.forEach(item => {
              if (!remoteMessages.some(rm => rm.id === item.id || (rm.text === item.text && rm.sender === item.sender))) {
                remoteMessages.push(item);
              }
            });
          }
        }
      }
    } catch (err) {
      // Offline fallback
    }
  }

  // 3. Merge with local storage cache (deduplicate)
  const local = getLocalChats(patientId, true);
  const combined = [...local];
  remoteMessages.forEach(rm => {
    const exists = combined.some(lm =>
      String(lm.id) === String(rm.id) ||
      (lm.sender === rm.sender && lm.text === rm.text && Math.abs(new Date(lm.created_at || 0) - new Date(rm.created_at || 0)) < 4000)
    );
    if (!exists) {
      combined.push(rm);
    }
  });

  combined.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
  saveLocalChats(patientId, combined);
  return combined;
}

export async function sendChatMessage(patientId, sender, text, meta = {}) {
  if (!patientId) return null;
  const pIdNum = Number(patientId);
  const validPatientId = !isNaN(pIdNum) ? pIdNum : patientId;

  const newMsg = {
    patient_id: validPatientId,
    sender,
    text: String(text).trim(),
    is_concerning: Boolean(meta.is_concerning),
    concern_reason: meta.concern_reason || null,
    is_demo: Boolean(meta.is_demo),
    status: 'delivered',
    created_at: new Date().toISOString()
  };

  // 1. Immediately save to LocalStorage cache so it is instant
  const current = getLocalChats(patientId, false);
  const localMsg = { ...newMsg, id: Date.now() };
  const updated = [...current, localMsg];
  saveLocalChats(patientId, updated);

  // 2. Broadcast immediately to any other active tabs/components in same browser
  notifyChatUpdate(patientId, localMsg);

  // 3. Post to central server API /api/chats (enables sync to phones, other browsers, and tabs)
  if (typeof window !== 'undefined') {
    try {
      fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMsg)
      }).catch(() => {});
    } catch {}
  }

  // 4. If Supabase is connected with real URL, sync to remote database
  if (isSupabaseConfigured && supabase) {
    try {
      let { data, error } = await supabase
        .from('chat_messages')
        .insert([newMsg])
        .select()
        .single();

      if (error) {
        console.warn('Full chat_messages insert failed, retrying base schema:', error);
        const baseMsg = {
          patient_id: validPatientId,
          sender,
          text: newMsg.text,
          status: 'delivered',
          created_at: newMsg.created_at
        };
        const retry = await supabase
          .from('chat_messages')
          .insert([baseMsg])
          .select()
          .single();

        if (!retry.error && retry.data) {
          data = retry.data;
          error = null;
        }
      }

      if (!error && data) {
        const syncedMsg = { ...newMsg, ...data };
        const finalUpdated = updated.map(m => (m.id === localMsg.id ? syncedMsg : m));
        saveLocalChats(patientId, finalUpdated);
        notifyChatUpdate(patientId, syncedMsg);
        return syncedMsg;
      }
    } catch (err) {
      console.warn('Supabase send chat failed, local store used:', err);
    }
  }

  return localMsg;
}

export async function processPatientReplyAI(patient, text, recentMessages = []) {
  // Update patient's daily answer in record if pending
  try {
    await answerPatientQuestion(patient.id, text);
  } catch {}

  try {
    const res = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'process_patient_reply',
        patient,
        patientReply: text,
        recentMessages: (recentMessages || []).slice(-6)
      })
    });

    const json = await res.json();
    if (res.ok && json.success && json.data) {
      return json.data;
    }
  } catch (err) {
    console.warn('API call failed, falling back to local clinical evaluation:', err);
  }

  // Graceful rule-based fallback for demo mode
  const lower = (text || '').toLowerCase();
  const urgentKeywords = ['chest pain', 'breath', 'bleeding', 'blood', 'fever', 'swelling', 'severe', 'dizzy', 'vomit', 'worse'];
  const matched = urgentKeywords.filter(k => lower.includes(k));
  const isConcerning = matched.length > 0;

  return {
    is_concerning: isConcerning,
    concern_reason: isConcerning ? `Reported red-flag symptoms: "${matched.join(', ')}"` : null,
    ai_response: isConcerning
      ? `[Demo Mode] I have recorded your symptoms ("${matched.join(', ')}") and alerted your City General care team for review. If you are experiencing sudden severe chest pain, extreme breathlessness, or an emergency, please call 112/911 immediately. Are you resting comfortably right now?`
      : `[Demo Mode] Thank you for letting us know! Did you take your prescribed morning medications as scheduled?`,
    flag_patient: isConcerning,
    is_demo: true
  };
}
