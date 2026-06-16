# 🧠 VaultAI — Shared AI Project Notebooks

Multi-user, real-time AI workspace. Chat with Claude, upload files, share project
context — all synced live across every user who opens your URL.

---

## ⚡ Deploy in 4 Steps

### STEP 1 — Create a Supabase project (free)

1. Go to **https://supabase.com** → Sign up / Log in
2. Click **New Project** → choose a name (e.g. `vaultai`) → set a DB password → Create
3. Wait ~1 min for it to spin up
4. Go to **Project Settings → API**
5. Copy:
   - **Project URL** → looks like `https://abcdefgh.supabase.co`
   - **anon public** key → long string starting with `eyJ...`

---

### STEP 2 — Run the database schema

1. In Supabase → click **SQL Editor** (left sidebar)
2. Click **+ New query**
3. Open the `schema.sql` file from this repo
4. Copy the entire contents → paste into the SQL editor
5. Click **Run** (green button)
6. You should see: `Success. No rows returned`

---

### STEP 3 — Deploy to Vercel (free)

**Option A — via GitHub (recommended)**

1. Push this folder to a GitHub repo:
   ```bash
   git init
   git add .
   git commit -m "VaultAI initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/vaultai.git
   git push -u origin main
   ```
2. Go to **https://vercel.com** → Sign up with GitHub → **Add New Project**
3. Import your `vaultai` repo → click **Configure Project**
4. Under **Environment Variables**, add:
   - `VITE_SUPABASE_URL` → paste your Supabase Project URL
   - `VITE_SUPABASE_ANON_KEY` → paste your anon key
5. Click **Deploy** → wait ~60 seconds

**Option B — via Vercel CLI**
```bash
npm install -g vercel
vercel login
vercel --prod
# Follow prompts, add env vars when asked
```

---

### STEP 4 — Share your URL

Vercel gives you a URL like:
```
https://vaultai-anurag.vercel.app
```

**Send this URL to any teammate.** They open it in any browser — no install, no Claude account needed. Everyone who opens it sees the same projects, messages, and files in real time.

---

## 🔑 First Use

Each person who opens the URL:
1. Types their **name** (shown in chat and presence list)
2. Pastes their **Anthropic API key** (from https://console.anthropic.com → API Keys)
   - The key is stored in their browser only — never sent to any server
   - Each person uses their own key and their own API credits

---

## 📁 Project Structure

```
vaultai/
├── src/
│   ├── main.jsx        # React entry point
│   ├── supabase.js     # Supabase client (reads env vars)
│   └── App.jsx         # Entire application (single file)
├── index.html          # HTML shell
├── package.json        # Dependencies
├── vite.config.js      # Vite config
├── vercel.json         # Vercel routing
├── schema.sql          # Run this in Supabase SQL Editor
└── .env.example        # Copy to .env for local dev
```

---

## 💻 Local Development

```bash
# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.example .env
# Edit .env → paste your Supabase URL and anon key

# 3. Run dev server
npm run dev
# Opens at http://localhost:5173
```

---

## ✨ Features

| Feature | How it works |
|---|---|
| **Real-time chat** | Supabase Realtime — messages appear instantly for all users |
| **Live presence** | Supabase Realtime Presence — see who's online with colored dots |
| **No race conditions** | Every message is its own database row — concurrent writes never clash |
| **File storage** | Supabase Storage bucket — upload .py, .pdf, .ipynb, .md, .csv, .json (max 5 MB) |
| **Project Context** | Per-project knowledge base Claude reads on every message |
| **Claude's thinking** | Extended thinking captured and stored — click 💭 to expand reasoning |
| **Export chat** | Download full conversation as Markdown including thinking blocks |
| **Multi-project** | Unlimited projects, each with their own chat, files, and context |

---

## 🔧 Tech Stack

- **Frontend**: React 18 + Vite
- **Database + Realtime**: Supabase (PostgreSQL + WebSockets)
- **File Storage**: Supabase Storage
- **AI**: Anthropic Claude (claude-sonnet-4-6 with extended thinking)
- **Hosting**: Vercel (free tier)

---

## ❓ FAQ

**Q: Is my Anthropic API key safe?**  
A: Yes. It's stored only in your browser's localStorage. It's sent directly from your browser to Anthropic's API — it never touches Vercel or Supabase servers.

**Q: Can multiple people use it at the same time?**  
A: Yes — that's the main point. All updates are real-time via Supabase WebSockets. Messages, files, and context changes appear instantly for all connected users.

**Q: What's the cost?**  
A: Supabase free tier (500 MB DB, 1 GB storage) and Vercel free tier are both sufficient for a small team. You pay only for Anthropic API usage per your own key.

**Q: How do I add more team members?**  
A: Just share the Vercel URL. Anyone with the link can join — there's no invite system by design.

**Q: Can I restrict access?**  
A: Not by default. VaultAI is designed as a private team tool — only share the URL with people you trust. To add auth, you can enable Supabase Auth and Row Level Security.
