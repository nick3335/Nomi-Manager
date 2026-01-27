# Nomi Manager

**Nomi Manager** is the ultimate offline-first workspace for organizing, editing, and mastering your Nomi.ai experience. 

Designed as a lightweight, single-file Progressive Web App (PWA), it gives you granular control over your Nomis' backstories, group contexts, and image galleries—all stored locally on your device or synced privately via your own GitHub Gist.

## 🚀 Launch App

No installation required. Run it directly in your browser:

👉 **[Open Nomi Manager](https://nick3335.github.io/Nomi-Manager/)**

---

## ✨ Features

### 🧠 Advanced Profile Editing
* **Field Management:** Edit every core field (Backstory, Inclination, Roleplay Context, Appearance, etc.) with a clean, focused UI.
* **Smart Limits:** Real-time character counters turn red when you exceed Nomi.ai's specific limits for each field.
* **Custom Layouts:** Reorder sections via drag-and-drop and create **Custom Text Sections** for your own notes, drafts, or alternate scenarios.
* **Batch Tools:** Collapse/Expand all sections or copy entire profiles to your clipboard with one click.

### 👥 Group Context Orchestration
* **Shared History:** detailed management for Group Backstories (1000 char limit).
* **Member Management:** Quickly link or unlink Nomis to groups.
* **Custom Fields:** Add scratchpads and plotting notes specific to group dynamics.

### 🎨 Gallery & Prompt Archiving
* **Masonry Grid:** A beautiful, responsive gallery for your Nomi's generated images.
* **Prompt Saver:** Never lose a "recipe." Store the generation prompt attached directly to the image.
* **In-Place Editing:** Edit prompts directly on the card (Desktop) or via a focused popup (Mobile).
* **Integrated Cropper:** Zoom and crop images perfectly for Nomi or Group avatars before setting them.

### ☁️ Data & Sync
* **Nomi.ai Import:** seamless one-way sync to pull your existing Nomis and avatars using your API Key.
* **Cloud Sync (GitHub Gist):** Sync your data between devices (PC ↔ Mobile) using your own private GitHub Gist as a secure cloud locker.
* **Offline First:** By default, all data lives in `IndexedDB` within your browser.
* **Backups:** Export/Import your full database as a raw JSON file.

### 💎 Customization
* **Themes:** Switch between 5 distinct visual styles: **Cyber** (Pink), **Matrix** (Green), **Royal** (Gold), **Crimson** (Red), and **Ice** (Blue).
* **Mobile Experience:** Install to your home screen as a PWA for a native app-like feel (removes browser bars, full screen).

---

## 🛠️ Setup Guide

### 1. Import from Nomi.ai
To populate your manager with your current roster:
1. Go to **Settings** (Fab Button > Gear Icon).
2. Enter your **Nomi.ai API Key** (found in the Nomi App under *Profile > Integrations*).
3. Click **Import from Nomi.ai**.

### 2. Setting up Cloud Sync (Multi-Device)
To sync data between your phone and desktop:
1. **Get a GitHub Token:** - Go to GitHub Settings > Developer Settings > Personal Access Tokens (Classic).
   - Generate a new token with `gist` scope selected.
2. **Create a Gist:**
   - Create a new secret Gist at [gist.github.com](https://gist.github.com).
   - Name the file `nomi-data.json` and put `{}` inside.
3. **Connect Nomi Manager:**
   - In App Settings, paste your **GitHub Token** and the **Gist ID** (from your Gist URL).
   - Enable **Auto-Sync** to automatically upload changes.

---

## 🔒 Privacy & Security

Nomi Manager is a **client-side application**.
* **Your Data:** Stored locally in your browser.
* **Your API Keys:** Stored locally on your device. They are sent *only* to Nomi.ai (to fetch data) or GitHub (to sync data).
* **No Tracking:** There are no analytics, tracking pixels, or third-party servers involved.

## 🤝 Contributing

Found a bug or have a feature request? Issues and Pull Requests are welcome!

## 📄 License

[MIT License](LICENSE)
