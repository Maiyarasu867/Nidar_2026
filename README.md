# NIDAR — Project Progress Log & Team Hub

A minimal, distraction-free, passwordless web application for project progress reporting, collaborative sprint tracking, and meeting scheduling.

- **Zero Passwords**: Members enter **Name** and **Role** once to receive a unique **Member ID** (e.g. `NDR-104`). Subsequent visits automatically log in on recognized devices or with just the ID.
- **Personal & Team Checklists**: Dedicated tabs for **Team Checklist** (collaborative sprint tasks) and **Personal Checklist** (private daily to-dos for each member).
- **Dynamic Categories**: Add any project category on the fly (no hardcoded sample categories).
- **Screenshots & Lightbox**: Attach screenshots or paste directly with `Ctrl+V`. Click to enlarge in full-resolution modal.
- **Zero Cloud Fees**: Built-in SQLite (`data/nidar.sqlite`) and local media storage (`uploads/`).

---

## 🚀 How to Upload to GitHub

In your project directory (`/home/nexus/NIDAR/Nidar_webside`), run:

```bash
git init
git add .
git commit -m "Initial release of NIDAR Project Hub"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

*(Note: `.gitignore` is already configured so sensitive database files, environment secrets, and test uploads are not committed).*

---

## ☁️ Deploying to a Free Cloud Host (Remote Accessible to Everyone)

### Option A: Render (Free Web Service)
1. Go to [render.com](https://render.com) and create a free account.
2. Click **New +** → **Web Service** → Connect your GitHub repository.
3. Configure settings:
   - **Environment**: `Node` (or `Docker`)
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
4. In **Environment Variables**, add:
   - `PROJECT_PASSCODE`: Your team secret key (e.g. `NIDAR2026`)
   - `NODE_ENV`: `production`
5. Click **Deploy Web Service**! Render will give you a public HTTPS URL like `https://nidar-hub.onrender.com`.

*(Tip: On Render, you can attach a free persistent Disk mounted at `/var/data` and add environment variables `DATA_DIR=/var/data` and `UPLOADS_DIR=/var/data/uploads` so all uploads and database files survive redeployments).*

---

### Option B: Railway (Free / Hobby)
1. Go to [railway.app](https://railway.app).
2. Click **New Project** → **Deploy from GitHub repo**.
3. Add environment variable `PROJECT_PASSCODE=NIDAR2026`.
4. Railway will automatically detect Next.js and launch it on an HTTPS domain.

---

### Option C: Instant Temporary Public Link (Cloudflare Tunnel)
If you want to run it on your own laptop right now and share an instant HTTPS link with teammates:
```bash
# Terminal 1:
npm start

# Terminal 2:
npx cloudflared tunnel --url http://localhost:3000
```
Share the generated `https://xxxx.trycloudflare.com` URL with your team.

---

## ✨ Features Overview

### 1. Dynamic Categories (No Sample Hardcoding)
- In the progress log form, pick an existing category or click **`+ Add New Category...`**.
- Type your custom category (e.g. `Embedded`, `UI/UX`, `Thermal`, `Firmware`) and press Enter to save.

### 2. Dual Checklists: Team vs Personal
- **Team Checklist**: Everyone can add, view, and check off project sprint items. Shows who completed each task with timestamp.
- **My Personal Checklist**: A private to-do list for your own daily workflow. Only you can view and check off your personal tasks.

### 3. Progress Logs & Screenshots
- Type daily achievements and outcomes.
- Flag blockers in amber callout boxes to request team help.
- **Clipboard paste (`Ctrl+V`)**: Press Ctrl+V while in the textarea to attach screenshots instantly.
- **Fullscreen Lightbox**: Click any image to open the fullscreen lightbox viewer with zoom and download.
- **Copy Today's Standup**: Single click formats today's logs into a Markdown summary for Slack or WhatsApp.

### 4. Meeting Scheduler
- Schedule upcoming reviews with Google Meet/Zoom links and agendas.
- Live countdown banner on the dashboard (e.g. *"Team Sync in 1h 15m"*).
