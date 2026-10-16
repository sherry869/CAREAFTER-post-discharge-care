# CareAfter — Setup & Deployment Checklist

Welcome to **CareAfter**! This checklist guides you step-by-step to get your hackathon project fully running, connected to Supabase, powered by Gemini AI, and deployed to Vercel.

---

## 📋 Hackathon Progress Checklist

- [ ] **GitHub Repository URL**: `__________________________________`
- [ ] **Supabase Project URL**: `__________________________________`
- [ ] **Supabase Publishable/Anon Key**: `__________________________________`
- [ ] **Supabase Database Setup Completed**: Run `supabase_setup.sql` in Supabase SQL Editor
- [x] **Gemini API Key (Server-side only)**: Added to `.env`
- [ ] **Vercel Project URL**: `__________________________________`
- [ ] **Vercel Environment Variables Configured**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `GEMINI_API_KEY`
- [ ] **Supabase Connection Tested**: Dashboard loads real patients from Supabase
- [ ] **Authentication Tested**: Hospital user login / logout works
- [ ] **Patient Records Persist After Refresh**: Add/edit/remove patients remains saved
- [ ] **Gemini Feature Tested**: Generated AI follow-up questions & care summary
- [ ] **Simulated WhatsApp Demo Tested**: Interactive chat modal with message timestamps and delivery ticks

---

## 🚀 Quick Step-by-Step Instructions

### Step 1: Install Dependencies & Run Locally
```bash
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### Step 2: Set Up Supabase (Real Backend)
1. Go to [https://supabase.com](https://supabase.com) and create a free account & project.
2. In your Supabase project, click on **SQL Editor** in the left sidebar.
3. Open the file `supabase_setup.sql` in this project, copy all its contents, paste it into the Supabase SQL Editor, and click **Run**.
4. Go to **Project Settings** -> **API** and copy:
   - **Project URL**
   - **anon / public key**
5. Open your local `.env` file and fill in:
   ```env
   VITE_SUPABASE_URL=https://your-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```
6. Restart your dev server (`npm run dev`). Your app will now load, save, edit, and delete real records directly in Supabase!

### Step 3: Server-side Gemini AI Setup
- The Gemini API key is already configured in your `.env` file under `GEMINI_API_KEY`.
- In local development, the built-in Vite server handles `/api/gemini` requests without exposing the key.
- On Vercel, the serverless function in `api/gemini.js` handles requests securely.

### Step 4: Push to GitHub
1. Initialize git and commit:
   ```bash
   git init
   git add .
   git commit -m "feat: complete CareAfter full-stack platform"
   ```
2. Create a new repository on [GitHub](https://github.com/new) (e.g., `CareAfter`).
3. Link and push your repository:
   ```bash
   git remote add origin https://github.com/<your-username>/CareAfter.git
   git branch -M main
   git push -u origin main
   ```
*(Note: `.env` is automatically ignored and will never be committed to GitHub).*

### Step 5: Deploy to Vercel
1. Log in to [https://vercel.com](https://vercel.com) and click **"Add New..."** -> **"Project"**.
2. Select your `CareAfter` GitHub repository and click **Import**.
3. Under **Environment Variables**, add:
   - `VITE_SUPABASE_URL` = your Supabase URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key
   - `GEMINI_API_KEY` = your Gemini API key
4. Click **Deploy**. Vercel will build and host your app live!
