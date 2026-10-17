// Server-Side Gemini API Route (Compatible with Vercel Serverless & Vite Dev Middleware)
// NEVER exposes GEMINI_API_KEY to the client bundle.

function getDemoModeResponse(type, patient, patientReply, responses, reason = 'Gemini API not configured') {
  if (type === 'process_patient_reply') {
    const text = (patientReply || '').toLowerCase();
    const urgentKeywords = [
      'chest pain', 'breath', 'short of breath', 'breathing', 'bleeding', 'blood',
      'fever', 'high temp', 'swelling', 'severe pain', 'unbearable', 'dizzy', 'fainted',
      'vomiting', 'black stool', 'wound open', 'pus', 'cannot walk', 'worse'
    ];
    const matched = urgentKeywords.filter(k => text.includes(k));
    const isConcerning = matched.length > 0;
    
    let aiResponse = '';
    let concernReason = null;
    
    if (isConcerning) {
      concernReason = `Patient reported potential red-flag symptoms: "${matched.join(', ')}"`;
      aiResponse = `[Demo Mode] Thank you for reporting this. I have recorded your symptoms and flagged this for your City General care team to review. If you are experiencing sudden severe chest pain, extreme breathlessness, or an emergency, please call 112/911 immediately. Are you resting comfortably right now?`;
    } else {
      const day = patient?.day_post_discharge || patient?.day || 1;
      if (day <= 3) {
        aiResponse = `[Demo Mode] Thank you for letting us know! It is good to hear from you. Have you been able to take your prescribed morning medications as directed?`;
      } else if (day <= 7) {
        aiResponse = `[Demo Mode] Glad to hear! How is your mobility and comfort level when walking around the house today?`;
      } else {
        aiResponse = `[Demo Mode] Thank you for the update! Have you noticed any new swelling, pain, or changes in your appetite today?`;
      }
    }

    return {
      is_concerning: isConcerning,
      concern_reason: concernReason,
      ai_response: aiResponse,
      flag_patient: isConcerning,
      is_demo: true,
      demo_note: reason
    };
  }

  if (type === 'generate_question') {
    const day = patient?.day_post_discharge || patient?.day || 1;
    return {
      question: `[Demo Mode] Good morning ${patient?.name || ''}, how is your recovery progressing on Day ${day}, and are you having any discomfort?`,
      suggested_options: ['Feeling better', 'About the same', 'Feeling worse'],
      clinical_rationale: 'Daily recovery check-in (Rule-based Demo Mode)',
      is_demo: true
    };
  }

  if (type === 'summarize_triage') {
    const hasSevere = (responses || []).some(r => {
      const txt = JSON.stringify(r).toLowerCase();
      return txt.includes('severe') || txt.includes('worse') || txt.includes('bad') || txt.includes('pain');
    });
    return {
      summary: hasSevere
        ? 'Patient reported severe or worsening symptoms during recovery.'
        : 'Patient reports steady recovery with no acute distress.',
      priority: hasSevere ? 'HIGH' : 'ROUTINE',
      suggestions: hasSevere
        ? ['Conduct nurse telephone follow-up within 2 hours', 'Review medication compliance']
        : ['Continue routine remote daily check-ins'],
      disclaimer: 'AI-assisted clinical summary (Demo Mode). Requires human review.',
      is_demo: true
    };
  }

  if (type === 'parse_medical_file') {
    const fileContent = extra.fileContent || '';
    const fileName = extra.fileName || '';
    const text = fileContent.toLowerCase();
    const cleanFileName = fileName
      .replace(/\.[^/.]+$/, '')
      .replace(/[_-]/g, ' ')
      .replace(/discharge|summary|report|note|medical|record|patient/gi, '')
      .trim();

    // Heuristic department scoring
    const deptScores = { Cardiology: 0, Pulmonology: 0, Orthopedics: 0, Neurology: 0 };
    const keywords = {
      Cardiology: ['heart', 'cardio', 'cardiac', 'failure', 'infarction', 'angina', 'stent', 'bypass', 'furosemide', 'sacubitril', 'carvedilol', 'metoprolol', 'hypertension', 'afib', 'arrhythmia', 'edema', 'troponin'],
      Pulmonology: ['lung', 'cough', 'copd', 'asthma', 'pneumonia', 'respiratory', 'breathing', 'shortness of breath', 'phlegm', 'inhaler', 'tiotropium', 'prednisolone', 'wheezing', 'oxygen', 'spo2'],
      Orthopedics: ['bone', 'fracture', 'joint', 'hip', 'knee', 'replacement', 'arthroplasty', 'ligament', 'acl', 'cast', 'crutches', 'paracetamol', 'ibuprofen', 'physiotherapy', 'mobility', 'spine'],
      Neurology: ['stroke', 'brain', 'neuro', 'ischemic', 'hemorrhage', 'seizure', 'weakness', 'numbness', 'paralysis', 'clopidogrel', 'atorvastatin', 'facial', 'slurred', 'speech', 'headache']
    };
    for (const [d, terms] of Object.entries(keywords)) {
      terms.forEach(t => { if (text.includes(t)) deptScores[d] += 1; });
    }
    let detectedDept = 'Cardiology';
    let maxScore = -1;
    for (const [d, sc] of Object.entries(deptScores)) {
      if (sc > maxScore && sc > 0) { maxScore = sc; detectedDept = d; }
    }

    // Heuristic name extraction
    let extractedName = '';
    const nameMatch = fileContent.match(/(?:patient(?:\s*name)?|name|pt\.?\s*name)[\s:=–-]+([A-Za-z\s.'-]{2,40})/i);
    if (nameMatch && nameMatch[1]) {
      extractedName = nameMatch[1].trim();
    } else if (cleanFileName && cleanFileName.length > 2) {
      extractedName = cleanFileName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }

    // Heuristic age
    let extractedAge = '';
    const ageMatch = fileContent.match(/(?:age|years?\s*old|y[\/.]?o)[\s:=–-]*([0-9]{1,3})/i) ||
                     fileContent.match(/\b([0-9]{1,3})\s*(?:years?\s*old|y[\/.]?o|yrs?\s*old)\b/i);
    if (ageMatch && ageMatch[1]) {
      extractedAge = Number(ageMatch[1]);
    }

    // Heuristic phone
    let extractedPhone = '+91 ';
    const phoneMatch = fileContent.match(/(?:phone|contact|mobile|tel)[\s:=–-]*([+\d\s()-]{8,18})/i) ||
                       fileContent.match(/(?:\+?91[\s-]?)?[6-9]\d{9}/);
    if (phoneMatch && phoneMatch[0]) {
      extractedPhone = phoneMatch[0].trim();
    }

    // Heuristic diagnosis
    let extractedDx = '';
    const dxMatch = fileContent.match(/(?:diagnosis|dx|condition|impression|assessment)[\s:=–-]+([^\n\r;]{3,80})/i);
    if (dxMatch && dxMatch[1]) {
      extractedDx = dxMatch[1].trim();
    } else if (maxScore > 0) {
      extractedDx = `${detectedDept} recovery condition`;
    }

    // Heuristic medications
    let extractedMeds = '';
    const medsMatch = fileContent.match(/(?:medications?|medicines?|rx|prescriptions?)[\s:=–-]+([^\n\r]{3,100})/i);
    if (medsMatch && medsMatch[1]) {
      extractedMeds = medsMatch[1].trim();
    }

    // Heuristic history
    let extractedHist = '';
    const histMatch = fileContent.match(/(?:medical\s*history|past\s*history|pmhx?|history)[\s:=–-]+([^\n\r]{3,100})/i);
    if (histMatch && histMatch[1]) {
      extractedHist = histMatch[1].trim();
    }

    // Heuristic risk factors
    let extractedRisk = '';
    const riskMatch = fileContent.match(/(?:risk\s*factors?|risks?|comorbidities|alerts?)[\s:=–-]+([^\n\r]{3,100})/i);
    if (riskMatch && riskMatch[1]) {
      extractedRisk = riskMatch[1].trim();
    }

    // Clinical status flag based on clinical keywords
    let status = 'green';
    if (text.includes('critical') || text.includes('severe') || text.includes('unstable') || text.includes('acute')) {
      status = 'red';
    } else if (text.includes('observation') || text.includes('moderate') || text.includes('monitor')) {
      status = 'amber';
    } else if (text.includes('follow-up') || text.includes('due') || text.includes('routine')) {
      status = 'blue';
    }

    return {
      name: extractedName,
      age: extractedAge || '',
      phone: extractedPhone,
      dept: detectedDept,
      dx: extractedDx,
      status,
      meds: extractedMeds,
      hist: extractedHist,
      risk: extractedRisk,
      is_demo: true,
      demo_note: reason
    };
  }

  return { result: 'Demo Mode executed', is_demo: true };
}

export default async function handler(req, res) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    return;
  }

  // Parse request body
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }

  const { type, patient, responses, patientReply, recentMessages, fileContent, fileName, mimeType, base64Data } = body || {};

  const apiKey = process.env.GEMINI_API_KEY;
  const isKeyConfigured = apiKey && apiKey !== 'your-gemini-api-key' && apiKey.length > 10;

  // If Gemini API is not configured, gracefully return clearly labeled Demo Mode
  if (!isKeyConfigured) {
    const demoData = getDemoModeResponse(type, patient, patientReply, responses, 'GEMINI_API_KEY is not set', { fileContent, fileName });
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: true, data: demoData }));
    return;
  }

  try {
    let prompt = '';
    let systemInstruction = `You are CareAfter's post-discharge clinical assistant for hospital patients and nurses.
CRITICAL SAFETY RULES:
- Never provide a diagnosis or alter prescribed medications/dosages.
- Serious or worsening symptoms MUST be flagged for human clinical review.
- If emergency symptoms are present (severe chest pain, extreme breathlessness, heavy bleeding), instruct the patient to call emergency services (112/911) or contact the hospital immediately.
- All AI responses are assistive and require human care team oversight.`;

    if (type === 'process_patient_reply') {
      const priorHistory = (recentMessages || [])
        .map(m => `${m.sender}: ${m.text}`)
        .slice(-6)
        .join('\n');

      prompt = `Analyze this discharged patient's reply and generate an empathetic acknowledgment and an adaptive next follow-up question.
Patient Context:
- Name: ${patient?.name || 'Patient'}
- Age: ${patient?.age || 'Unknown'}
- Department: ${patient?.dept || 'General'}
- Diagnosis: ${patient?.dx || 'General Recovery'}
- Day Post-Discharge: Day ${patient?.day_post_discharge || patient?.day || 1}
- Medications: ${patient?.medications || patient?.meds || 'None specified'}
- Risk Factors: ${patient?.risk_factors || patient?.risk || 'None specified'}

Recent Conversation History:
${priorHistory || 'None'}

Patient's New Reply:
"${patientReply || ''}"

Guidelines:
1. Detect any concerning symptoms (severe pain, breathlessness, fever, wound discharge, chest discomfort, fainting, fluid retention).
2. If concerning symptoms are found, set is_concerning=true, provide concern_reason for the nurse, and advise contacting the clinical team or calling 112/911 if severe.
3. If stable, acknowledge their response warmly and ask ONE targeted, non-repetitive recovery question suitable for Day ${patient?.day_post_discharge || patient?.day || 1}. Avoid repeating questions already asked.
4. Keep the response concise (1-2 sentences).

Return your response in strict JSON format:
{
  "is_concerning": true,
  "concern_reason": "Brief clinical note explaining the concern for the nurse",
  "ai_response": "Empathetic acknowledgment + next adaptive question or safety advice",
  "flag_patient": true
}`;
    } else if (type === 'generate_question') {
      prompt = `Generate ONE concise, empathetic, patient-friendly follow-up question for a patient discharged ${patient?.day_post_discharge || patient?.day || 1} day(s) ago.
Patient Context:
- Name: ${patient?.name || 'Patient'}
- Diagnosis: ${patient?.dx || 'General'}
- Department: ${patient?.dept || 'General'}
- Medications: ${patient?.medications || patient?.meds || 'None specified'}
- Risk Factors: ${patient?.risk_factors || patient?.risk || 'None specified'}

Return your response in strict JSON format:
{
  "question": "The patient-friendly question to send via SMS/WhatsApp",
  "suggested_options": ["Option 1", "Option 2"],
  "clinical_rationale": "Brief note for the nurse explaining why this was asked"
}`;
    } else if (type === 'summarize_triage') {
      prompt = `Analyze this discharged patient's recent follow-up responses and suggest care team actions.
Patient Context:
- Name: ${patient?.name}
- Age: ${patient?.age}
- Department: ${patient?.dept}
- Diagnosis: ${patient?.dx}
- Discharge Day: Day ${patient?.day_post_discharge || patient?.day}
- Recent Responses: ${JSON.stringify(responses || patient?.today || [])}

Return your response in strict JSON format:
{
  "summary": "1-2 sentence clinical summary of current recovery progress",
  "priority": "HIGH or ROUTINE",
  "suggestions": ["Action item 1 for hospital nurse/doctor", "Action item 2", "Action item 3"],
  "disclaimer": "AI-assisted clinical summary. Requires human care team verification."
}`;
    } else if (type === 'parse_medical_file') {
      prompt = `Extract all clinical and demographic patient details from this medical discharge summary or hospital file.
File Name: ${fileName || 'Medical File'}
Document Content:
${fileContent || ''}

Extraction Rules:
1. "name": Extract the patient's full name from the document. If no name is mentioned, extract an appropriate name from the file name, or leave as "". NEVER invent a fictional name like "Anil Kumar".
2. "age": Extract patient age as integer number, or null if absent.
3. "phone": Extract patient contact/phone number if present (keep any +91 or standard format), or "".
4. "dept": Choose exactly one matching hospital department: "Cardiology", "Pulmonology", "Orthopedics", or "Neurology".
5. "dx": Primary discharge diagnosis or surgical procedure (e.g. "Acute Bronchitis", "Total Hip Arthroplasty", "Atrial Fibrillation", "Ischemic Stroke").
6. "status": Initial clinical triage status: "red" (severe/acute/high risk), "amber" (observation/moderate symptoms), "blue" (follow-up due/scheduled tests), or "green" (stable/normal recovery).
7. "meds": List of prescribed medications on discharge as a comma-separated string.
8. "hist": Relevant medical history or comorbidities (e.g. "Type 2 diabetes, Hypertension").
9. "risk": Clinical risk factors, lifestyle factors, or discharge alerts (e.g. "Lives alone, low salt diet, fall risk").

Strictly return ONLY JSON in this format:
{
  "name": "...",
  "age": 45,
  "phone": "...",
  "dept": "Pulmonology",
  "dx": "...",
  "status": "amber",
  "meds": "...",
  "hist": "...",
  "risk": "..."
}`;
    } else {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Invalid request type' }));
      return;
    }

    // Candidate Gemini models to try in order (Fast, low-credit usage)
    const candidateModels = [
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-1.5-flash',
      'gemini-3.5-flash',
      'gemini-3-flash-preview'
    ];

    let lastError = null;
    let data = null;

    for (const model of candidateModels) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              systemInstruction: {
                parts: [{ text: systemInstruction }]
              },
              contents: [
                {
                  parts: [
                    ...(base64Data ? [{
                      inlineData: {
                        mimeType: mimeType || 'application/pdf',
                        data: base64Data
                      }
                    }] : []),
                    { text: prompt }
                  ]
                }
              ],
              generationConfig: {
                responseMimeType: 'application/json',
                temperature: 0.2
              }
            })
          }
        );

        if (response.ok) {
          data = await response.json();
          break;
        } else {
          lastError = await response.text();
        }
      } catch (err) {
        lastError = err.message;
      }
    }

    // If Gemini API fails (quota or model failure), gracefully fall back to Demo Mode
    if (!data) {
      console.warn('Gemini API call failed, falling back to Demo Mode:', lastError);
      const fallbackData = getDemoModeResponse(type, patient, patientReply, responses, 'Gemini API call failed, used demo mode', { fileContent, fileName });
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: true, data: fallbackData }));
      return;
    }

    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    let parsedResult;
    try {
      parsedResult = JSON.parse(rawText);
    } catch {
      parsedResult = { ai_response: rawText, is_concerning: false };
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: true, data: parsedResult }));
  } catch (err) {
    // Ultimate fallback to Demo Mode if unexpected exception occurs
    console.error('Server error in gemini handler, using demo fallback:', err);
    const fallbackData = getDemoModeResponse(type, patient, patientReply, responses, err.message, { fileContent, fileName });
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: true, data: fallbackData }));
  }
}
