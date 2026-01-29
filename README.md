# Nomi Manager

**Nomi Manager** is a powerful, offline-first web application designed to help you organize, back up, and manage your Nomi.ai companions and groups. 

Built as a lightweight Single Page Application (SPA), it runs entirely in your browser. You can host it yourself, run it locally, or use the hosted version on GitHub Pages.

**[Use it Now!](https://nick3335.github.io/Nomi-Manager)** 👈

---

## ✨ Key Features

### 🧠 Profile Management
* **Deep Editing:** Manage Backstory, Personality, Preferences, and Boundaries.
* **Custom Sections:** Create your own data fields (e.g., "Writing Style," "Lore," "Stats") and reorder them via drag-and-drop.
* **Group Management:** Manage group members, assign custom roles/notes per member, and edit group backstories.

### 🖼️ Gallery & Media
* **Prompt Manager:** View, edit, and copy the generation prompts associated with your images.
* **Masonry Grid:** View images in a responsive grid with batch selection for bulk deletion.
* **Smart Cropping:** Built-in tools to crop and set custom avatars for Nomis and Groups.
* **Compression:** Built-in storage optimization to compress images and save space.

### ☁️ Sync & Data
* **Nomi.ai Import:** Directly import your Nomis and Avatars using your Nomi.ai API Key.
* **Cloud Sync:** Sync your data across devices using a private **GitHub Gist** (Free & Secure).
* **Offline First:** All data is stored locally in your browser (IndexedDB).
* **JSON Backup:** Export/Import full backups as JSON files.

### 🎨 UI/UX
* **Multiple Themes:** Midnight (Default), Paper (Light), OLED (True Black), and Terminal.
* **Responsive:** Fully optimized for mobile and desktop usage.
* **PWA Support:** Can be installed as an app on your phone's home screen.

---

## 🚀 Getting Started

### Option 1: Web Version (Recommended)
Simply visit the [GitHub Pages Link](#) for this repository. The app runs in your browser, and no installation is required.

### Option 2: Run Locally
1.  Download the `index.html` file from this repository.
2.  Open `index.html` in any modern web browser (Chrome, Edge, Safari, Firefox).

---

## ⚙️ Configuration Guide

### 1. Importing from Nomi.ai
To populate the app with your current Nomis:
1.  Open **Settings** (Gear icon).
2.  Paste your **Nomi.ai API Key**.
    * *You can get this from Nomi.ai > Settings > Integration.*
3.  Click **"Import from Nomi.ai"**.
4.  *Note: This connects directly to Nomi.ai through your browser. Your key is stored only in your local browser storage.*

### 2. Setting up Cloud Sync (Cross-Device)
Nomi Manager uses GitHub Gists to sync data between your phone and PC without a central server.

1.  **Get a GitHub Token:**
    * Go to [GitHub Developer Settings](https://github.com/settings/tokens).
    * Generate a **New Token (Classic)**.
    * Scope: Check the **`gist`** box.
    * Copy the token (starts with `ghp_...`).
2.  **Create the Gist:**
    * Go to [gist.github.com](https://gist.github.com).
    * Create a new Gist with the filename `.json` and content `{}` (curly braces).
    * Create it as a **Secret Gist**.
    * Copy the **Gist ID** from the URL bar (the long string of numbers/letters at the end).
3.  **Configure App:**
    * In Nomi Manager Settings, enter your **GitHub Token** and **Gist ID**.
    * Enable "Auto-Sync" to keep devices updated automatically.

---

## 🔒 Privacy & Security

* **Zero Data Collection:** This app does not have a backend server. The developer cannot see your Nomis, API keys, or personal data.
* **Local Storage:** All data lives in your browser's `IndexedDB`.
* **Direct Connections:** API requests go directly from your browser to Nomi.ai or GitHub.
* **Open Source:** The entire code is contained in `index.html`. You can inspect it to verify no data is being siphoned.

---

## 🛠️ Deployment (For Developers)

If you want to host your own version:

1.  Fork this repository.
2.  Go to your repository **Settings** > **Pages**.
3.  Select `main` branch as the source.
4.  Your site will be live at `https://<your-username>.github.io/<repo-name>/`.

---

## 📝 License

This project is open-source. Feel free to modify and distribute for personal use.
