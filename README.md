# CareAfter: Post-Discharge Care Coordination & Clinical Triage Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-18.3-61dafb.svg?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.2-646cff.svg?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ecf8e.svg?logo=supabase&logoColor=white)](https://supabase.com/)
[![Google Gemini](https://img.shields.io/badge/Google%20Gemini-Flash-8e75ff.svg?logo=google&logoColor=white)](https://ai.google.dev/)
[![spaCy / BioBERT](https://img.shields.io/badge/spaCy-BioBERT%20NER-09a3d5.svg?logo=spacy&logoColor=white)](https://huggingface.co/pmaitra/en_biobert_ner_symptom)

CareAfter is an intelligent post-discharge care coordination platform designed for hospital nursing staff, case managers, and outpatient teams. It bridges the critical 1 to 14-day transition period when patients leave inpatient care, transforming manual nurse follow-up calls into automated, adaptive check-ins paired with clinical natural language processing (NLP) and risk stratification.

---

## The Clinical Challenge

The first two weeks following hospital discharge carry the highest risk of medication non-compliance, unmonitored symptom escalation, and preventable 30-day emergency readmissions. Traditional post-discharge workflows suffer from three recurring bottlenecks:

1. **Phone Tag & Low Response Rates**: Nurse-led outreach relies on cold calling, frequently resulting in voicemail rates exceeding 70%.
2. **Rigid, Impersonal Checklists**: Static forms ask redundant questions that ignore the patient's individual diagnosis, recovery day, or newly emerging symptoms.
3. **Delayed Escalation**: When patients begin experiencing early warning indicators (e.g., progressive dyspnea, wound redness, localized swelling), symptoms often go unflagged until acute hospitalization is required.

CareAfter solves this by combining asynchronous mobile messaging channels with a dual AI layer: fine-tuned BioBERT token classification for objective symptom identification, and Google Gemini for personalized, context-aware triage question synthesis.

---

## System Architecture

```mermaid
flowchart TD
    subgraph Patient Channel
        P[Discharged Patient] <-->|WhatsApp / SMS Check-in| WAS[WhatsApp Web Simulator]
    end

    subgraph CareAfter Frontend
        WAS <--> UI[Clinical Dashboard & Patient Detail]
        UI -->|Manual Triage & Flagging| STAFF[Hospital Care Team]
        UI -->|Export| CR[Clinical Discharge Summary PDF]
    end

    subgraph Backend & Serverless Layer
        UI <-->|Vite Dev Proxy / Vercel Serverless| API[/api/gemini]
        API <-->|Contextual Prompts| GEMINI[(Google Gemini 2.5 Flash)]
    end

    subgraph Clinical NLP & Benchmarks
        SCRIPTS[scripts/fetch_hf_resources.py] --> BIOBERT[en_biobert_ner_symptom\nBioBERT Transformer]
        SCRIPTS --> CHIBENCH[actava/chi-bench\nClinical Dialogue Benchmark]
    end

    subgraph Persistence Layer
        UI <-->|PostgreSQL REST + Realtime| SUPA[(Supabase Database)]
        SUPA --> T1[(patients)]
        SUPA --> T2[(follow_up_questions)]
        SUPA --> T3[(chat_messages)]
    end
```

---

## Core Capabilities

### 1. Department-Level Ward Monitoring
* **Multi-Service Filtering**: Instantly isolate patient cohorts across Cardiology, Orthopedics, Pulmonology, and General Surgery.
* **Immediate Risk Escalation**: Automated and manual red-flagging (`Needs Care` vs `Stable`) prioritizes patients who report acute vitals or worsening symptom patterns.
* **Timeline Tracking**: Visual indicators track current post-discharge day (`Day 1` through `Day 14+`) against standardized recovery milestones.

### 2. Dual-Layer Clinical Intelligence
* **BioBERT Token Extraction (`en_biobert_ner_symptom`)**:
  Pre-trained on clinical corpora (Maccrobat & i2b2) to extract symptom entities from free-form patient replies with high recall (99.94%) and precision (99.97%).
* **Adaptive Question Synthesis (Google Gemini)**:
  Rather than static scripts, the system drafts tailored questions reflecting patient diagnosis, days since discharge, risk history, and current medications.
* **Automated Triage Summaries**:
  Aggregates multi-day responses into actionable clinical summaries with suggested interventions for the attending team.

### 3. Asynchronous Patient Chat Simulator
* Realistic WhatsApp interface demonstrating the end-to-end patient experience.
* Includes message status indicators (sent, delivered, read receipts), quick-reply answer chips, and bidirectional synchronization with the clinical database.

### 4. Enterprise-Ready Data Architecture
* **Supabase Integration**: Backed by PostgreSQL with Row Level Security (RLS) policies protecting patient records.
* **Offline Mock Fallback**: When external cloud services are unconfigured, the platform seamlessly runs against an in-memory clinical mock dataset for demonstration, testing, and offline hackathon evaluation.
* **Secure Server-Side AI**: Gemini API keys are never exposed in client bundles; all model interactions route through serverless edge functions.

---

## Tech Stack

| Domain | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend Framework** | React 18.3 | Component architecture and state management |
| **Build Tool** | Vite 6.2 | Hot-module replacement and production bundling |
| **Styling** | Custom Vanilla CSS | Design token system with native light/dark mode support |
| **Backend / DB** | Supabase (PostgreSQL) | Managed database, REST API, and Row Level Security |
| **Generative AI** | Google Gemini 2.5 Flash | Dynamic clinical inquiry and recovery triage synthesis |
| **Clinical NLP** | spaCy + BioBERT Transformer | Fine-grained symptom entity extraction from text |
| **Hosting & API** | Vercel Serverless Functions | Edge deployment and secure API proxying |

---

## Repository Structure

```
CAREAFTER-post-discharge-care/
├── api/
│   └── gemini.js                  # Serverless function handling Gemini API requests securely
├── models/
│   └── en_biobert_ner_symptom/    # Fine-tuned spaCy BioBERT pipeline for clinical symptom NER
│       ├── config.cfg             # Pipeline hyperparameters & transformer config
│       └── README.md              # Model card, evaluation metrics, and citations
├── scripts/
│   └── fetch_hf_resources.py      # Hugging Face dataset downloader and model validator
├── src/
│   ├── components/
│   │   ├── AddPatientModal.jsx    # Admission modal for new post-discharge records
│   │   ├── Dashboard.jsx          # Ward overview, KPI counters, and patient card grid
│   │   ├── EditPatientModal.jsx   # Clinical record editor
│   │   ├── GeminiModal.jsx        # AI question generator and triage action assistant
│   │   ├── Login.jsx              # Staff authentication barrier
│   │   ├── Navbar.jsx             # Top navigation, department filters, theme switcher
│   │   ├── PatientDetail.jsx      # Comprehensive clinical record, vitals & history view
│   │   ├── PatientReportModal.jsx # Clinical summary report generator for export
│   │   └── WhatsAppSimulator.jsx  # Interactive patient-facing messaging simulator
│   ├── data/
│   │   ├── clinicalKnowledge.json # Triage category rubrics and model references
│   │   └── mockPatients.js        # Fallback patient dataset for local/demo runs
│   ├── lib/
│   │   └── supabase.js            # Supabase client, queries, and fallback bridge
│   ├── App.jsx                    # Root view controller and modal orchestration
│   ├── index.css                  # CSS design system (tokens, layout, responsive styles)
│   └── main.jsx                   # React DOM entry point
├── supabase_setup.sql             # SQL migration file for tables, indexes, and RLS
├── vercel.json                    # Serverless routing configuration
├── vite.config.js                 # Vite configuration with local API dev server middleware
├── package.json                   # Dependencies and npm scripts
└── SETUP.md                       # Step-by-step setup and deployment checklist
```

---

## Database Schema

The platform uses three relational tables within Supabase PostgreSQL. Execute `supabase_setup.sql` in your Supabase SQL Editor to initialize the schema:

### 1. `patients`
Tracks demographic, admission, and clinical baseline status.
* `id` (BIGINT, Primary Key)
* `name` (TEXT)
* `age` (INTEGER)
* `dept` (TEXT) — *Cardiology, Orthopedics, Pulmonology, General Surgery*
* `dx` (TEXT) — *Primary discharge diagnosis*
* `phone` (TEXT)
* `day_post_discharge` (INTEGER)
* `is_flagged` (BOOLEAN) — *High-priority / Red flag status*
* `medications` (TEXT)
* `medical_history` (TEXT)
* `risk_factors` (TEXT)
* `ai_suggestions` (JSONB)
* `created_at`, `updated_at` (TIMESTAMPTZ)

### 2. `follow_up_questions`
Maintains daily check-in logs and patient responses.
* `id` (BIGINT, Primary Key)
* `patient_id` (BIGINT, Foreign Key -> `patients.id`)
* `question_text` (TEXT)
* `reply_text` (TEXT)
* `severity` (TEXT) — *normal, moderate, severe*
* `day_number` (INTEGER)
* `is_today` (BOOLEAN)
* `created_at` (TIMESTAMPTZ)

### 3. `chat_messages`
Stores bidirectional message transcripts for the simulated messaging channel.
* `id` (BIGINT, Primary Key)
* `patient_id` (BIGINT, Foreign Key -> `patients.id`)
* `sender` (TEXT) — *hospital, patient, system*
* `text` (TEXT)
* `status` (TEXT) — *sent, delivered, read*
* `created_at` (TIMESTAMPTZ)

---

## API Reference

The server-side endpoint `POST /api/gemini` handles all clinical AI tasks without exposing credentials to the client.

### 1. Generate Contextual Follow-Up Question
Requests a single, empathetic check-in question tailored to recovery day, diagnosis, and current medications.

**Request Payload:**
```json
{
  "type": "generate_question",
  "patient": {
    "name": "Marcus Vance",
    "age": 58,
    "dept": "Cardiology",
    "dx": "Congestive Heart Failure Exacerbation",
    "day_post_discharge": 3,
    "medications": "Furosemide 40mg daily, Lisinopril 10mg",
    "risk_factors": "History of fluid retention, elevated BP"
  }
}
```

**Response Payload:**
```json
{
  "success": true,
  "data": {
    "question": "Good morning Marcus, have you noticed any sudden swelling in your ankles or rapid weight gain since yesterday?",
    "suggested_options": ["No swelling", "Slight puffiness", "Noticeable swelling"],
    "clinical_rationale": "Early detection of fluid retention in CHF patients to prevent acute pulmonary edema."
  }
}
```

### 2. Summarize Recovery & Triage Actions
Analyzes recent responses across multiple post-discharge days to provide an overall clinical summary and prioritized care actions.

**Request Payload:**
```json
{
  "type": "summarize_triage",
  "patient": {
    "name": "Elena Rostova",
    "age": 42,
    "dept": "Orthopedics",
    "dx": "Post-Op Left Knee Arthroscopy",
    "day_post_discharge": 4
  },
  "responses": [
    { "q": "Are you able to bear partial weight?", "a": "Yes, with crutches.", "sev": "normal" },
    { "q": "Is pain controlled with prescribed medication?", "a": "Worsening pain and heat around incision.", "sev": "severe" }
  ]
}
```

**Response Payload:**
```json
{
  "success": true,
  "data": {
    "summary": "Patient demonstrates expected mobility with assistive device, but reports acute localized heat and uncontrolled pain at surgical site.",
    "priority": "HIGH",
    "suggestions": [
      "Contact patient immediately to assess wound erythema and check for surgical site infection.",
      "Evaluate analgesic regimen and schedule same-day wound review if febrile."
    ],
    "disclaimer": "AI-assisted clinical summary. Requires human care team verification."
  }
}
```

---

## Getting Started

### Prerequisites
* **Node.js**: v18.0.0 or higher
* **npm**: v9.0.0 or higher
* *(Optional)* **Python 3.10+**: Only required if running the local Hugging Face / spaCy BioBERT evaluation scripts.

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/sherry869/CAREAFTER-post-discharge-care.git
cd CAREAFTER-post-discharge-care
npm install
```

### 2. Environment Configuration
Create a `.env` file in the project root based on `.env.example`:
```bash
cp .env.example .env
```

Configure your credentials:
```env
# Supabase Configuration (Leave empty to use built-in offline mock data)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# Google Gemini API Key (Server-side execution only)
GEMINI_API_KEY=your-gemini-api-key
```

> **Note:** If `VITE_SUPABASE_URL` is omitted or left as a placeholder, CareAfter automatically boots in mock demonstration mode, populating the dashboard with pre-loaded clinical scenarios.

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 4. (Optional) Run Clinical NLP Benchmark Scripts
If testing the BioBERT symptom classification pipeline or Hugging Face dataset stream:
```bash
pip install spacy datasets huggingface_hub
python scripts/fetch_hf_resources.py
```

---

## Deployment (Vercel)

1. Push your repository to GitHub.
2. In the [Vercel Dashboard](https://vercel.com/), select **Add New Project** and import `CAREAFTER-post-discharge-care`.
3. Add the following **Environment Variables**:
   * `VITE_SUPABASE_URL`: Your Supabase Project URL
   * `VITE_SUPABASE_ANON_KEY`: Your Supabase Anonymous Public Key
   * `GEMINI_API_KEY`: Your Google Gemini API Key
4. Click **Deploy**. Vercel will automatically compile the Vite frontend and provision the `/api/gemini` serverless function.

---

## Clinical Decision Support (CDS) Disclaimer

> **Important**: CareAfter is a clinical prototype and decision support framework designed to augment hospital care coordination. It is not an FDA-cleared software as a medical device (SaMD) and does not provide definitive medical diagnoses or alter prescribed pharmacotherapy. All AI-generated questions, summaries, and triage categorizations require review and confirmation by a licensed healthcare professional before taking clinical action.

---

## License

This project is licensed under the [MIT License](LICENSE).
