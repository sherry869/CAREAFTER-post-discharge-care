// Serverless / Local Node API handler for shared chat messages
// Ensures real-time synchronization between phones, laptops, and multiple browsers

import fs from 'fs';
import path from 'path';
import os from 'os';

// In-memory cache for fast zero-latency access
const memoryChats = {};

const LOCAL_CHATS_FILE = path.resolve(process.cwd(), 'src/data/server_chats.json');
const TMP_CHATS_FILE = path.join(os.tmpdir(), 'careafter_server_chats.json');

function loadPersistedChats() {
  for (const filePath of [LOCAL_CHATS_FILE, TMP_CHATS_FILE]) {
    try {
      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, 'utf-8');
        const parsed = JSON.parse(data);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch {}
  }
  return {};
}

function savePersistedChats(data) {
  const jsonStr = JSON.stringify(data, null, 2);
  let saved = false;
  try {
    const dir = path.dirname(LOCAL_CHATS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(LOCAL_CHATS_FILE, jsonStr, 'utf-8');
    saved = true;
  } catch {}

  if (!saved) {
    try {
      fs.writeFileSync(TMP_CHATS_FILE, jsonStr, 'utf-8');
    } catch {}
  }
}

// Initialize from file
try {
  const loaded = loadPersistedChats();
  Object.assign(memoryChats, loaded);
} catch {}

export default async function chatsHandler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  // Parse URL
  const parsedUrl = new URL(req.url, `http://${req.headers?.host || 'localhost'}`);
  const patientId = parsedUrl.searchParams.get('patientId');

  if (req.method === 'GET') {
    res.setHeader('Content-Type', 'application/json');
    if (patientId) {
      const pIdStr = String(patientId);
      const list = memoryChats[pIdStr] || [];
      res.statusCode = 200;
      res.end(JSON.stringify({ success: true, data: list }));
      return;
    }

    res.statusCode = 200;
    res.end(JSON.stringify({ success: true, data: memoryChats }));
    return;
  }

  if (req.method === 'POST') {
    let payload = req.body;
    if (typeof payload === 'string') {
      try {
        payload = JSON.parse(payload);
      } catch {
        payload = {};
      }
    }

    const { patient_id, sender, text, is_concerning, concern_reason, is_demo, status } = payload || {};

    if (!patient_id || !text) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: false, error: 'Missing patient_id or text' }));
      return;
    }

    const pIdStr = String(patient_id);
    const newMsg = {
      id: Date.now(),
      patient_id: Number(patient_id) || patient_id,
      sender: sender || 'hospital',
      text: String(text).trim(),
      is_concerning: Boolean(is_concerning),
      concern_reason: concern_reason || null,
      is_demo: Boolean(is_demo),
      status: status || 'delivered',
      created_at: new Date().toISOString()
    };

    if (!memoryChats[pIdStr]) {
      memoryChats[pIdStr] = [];
    }

    // Append to list
    memoryChats[pIdStr].push(newMsg);
    savePersistedChats(memoryChats);

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: true, data: newMsg }));
    return;
  }

  res.statusCode = 405;
  res.end('Method Not Allowed');
}
