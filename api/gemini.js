// Server-Side Gemini API Route (Compatible with Vercel Serverless & Vite Dev Middleware)
// NEVER exposes GEMINI_API_KEY to the client bundle.

export default async function handler(req, res) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your-gemini-api-key') {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      error: 'GEMINI_API_KEY is not configured on the server. Please add it to your .env file or Vercel settings.'
    }));
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

  const { type, patient, responses } = body || {};

  try {
    let prompt = '';
    let systemInstruction = `You are CareAfter's post-discharge clinical assistant for hospital staff. 
You provide brief, evidence-based, compassionate follow-up questions and triage summaries.
CRITICAL SAFETY RULES:
- Never provide a diagnosis or change prescribed dosages.
- Always be cautious, patient-friendly, and concise.
- All outputs are AI-assisted suggestions that require human healthcare provider review.`;

    if (type === 'generate_question') {
      prompt = `Generate ONE concise, empathetic, patient-friendly follow-up question for a patient discharged ${patient?.day_post_discharge || patient?.day || 1} day(s) ago.
Patient Context:
- Name: ${patient?.name || 'Patient'}
- Diagnosis: ${patient?.dx || 'General'}
- Department: ${patient?.dept || 'General'}
- Medications: ${patient?.medications || patient?.meds || 'None specified'}
- Risk Factors: ${patient?.risk_factors || patient?.risk || 'None specified'}

Return your response in strict JSON format with exactly these keys:
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

Return your response in strict JSON format with exactly these keys:
{
  "summary": "1-2 sentence clinical summary of current recovery progress",
  "priority": "HIGH or ROUTINE",
  "suggestions": ["Action item 1 for hospital nurse/doctor", "Action item 2", "Action item 3"],
  "disclaimer": "AI-assisted clinical summary. Requires human care team verification."
}`;
    } else {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Invalid request type. Expected generate_question or summarize_triage' }));
      return;
    }

    // Try reliable Gemini Flash models in order
    const candidateModels = ['gemini-3.5-flash', 'gemini-3-flash-preview', 'gemini-3.8-flash'];
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
                  parts: [{ text: prompt }]
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
          break; // Succeeded
        } else {
          lastError = await response.text();
        }
      } catch (err) {
        lastError = err.message;
      }
    }

    if (!data) {
      res.statusCode = 502;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: `Gemini API request failed across all candidate models: ${lastError}` }));
      return;
    }

    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    let parsedResult;
    try {
      parsedResult = JSON.parse(rawText);
    } catch {
      parsedResult = { result: rawText };
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: true, data: parsedResult }));
  } catch (err) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: err.message || 'Server error calling Gemini' }));
  }
}
