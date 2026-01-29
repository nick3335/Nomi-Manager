# Nomi Manager

**Nomi Manager** is a powerful, offline-first workspace designed to give you complete control over your Nomi.ai experience. Built as a lightweight Progressive Web App (PWA), it allows you to organize backstories, manage group contexts, archive generation prompts, and sync your data privately across devices.

🔗 **[Launch Nomi Manager](https://nick3335.github.io/Nomi-Manager/)**

---

## ✨ Key Features

### 🧠 Deep Profile Management
Take full control of your Nomis' narratives with a distraction-free editor.
* **Granular Editing:** Edit every core field—including Backstory, Inclination, Roleplay Context, and Appearance.
* **Smart Limits:** Visual character counters warn you in real-time if you exceed Nomi.ai's context limits.
* **Custom Layouts:** Drag-and-drop sections to suit your workflow or add **Custom Text Sections** for notes, drafts, and alternate scenarios.
* **Batch Actions:** Copy entire profiles or specific sections to your clipboard with a single click.

### 👥 Group Context Orchestration
Manage complex relationships and group dynamics effortlessly.
* **Shared History:** A detailed editor for Group Backstories with limit tracking.
* **Member Management:** Quickly link Nomis to groups and define their specific roles within that context.
* **Group Galleries:** Dedicated image galleries for group-specific generations.

### 🎨 Gallery & Prompt Archiving
Never lose a great generation or the prompt that created it.
* **Prompt Saver:** Every image in your gallery stores its original generation prompt. View or copy it anytime.
* **Masonry Grid:** A responsive, beautiful gallery layout for browsing your collection.
* **Integrated Tools:** Built-in image cropper for setting perfect avatars and batch selection tools for managing large libraries.
* **Format Options:** Export images as WebP (efficient), PNG (high quality), or JPG (compatible).

### ☁️ Sync & Data Ownership
Your data belongs to you. Nomi Manager prioritizes privacy and portability.
* **Offline-First:** All data is stored locally in your browser using `IndexedDB`.
* **Nomi.ai Import:** Seamlessly pull your current roster and avatars directly from Nomi.ai using your API Key.
* **Private Cloud Sync:** Sync data between devices (e.g., Desktop ↔ Mobile) using your own personal **GitHub Gist** as a secure, private cloud locker.
* **Backups:** Export your entire database to a JSON file for safe keeping.

### 💎 Customization
Make the workspace your own with integrated themes.
* **Visual Styles:** Choose from 5 distinct themes: **Cyber** (Pink), **Matrix** (Green), **Royal** (Gold), **Crimson** (Red), and **Ice** (Blue).
* **PWA Support:** Install directly to your home screen on mobile for a native, full-screen app experience.

---

## 🚀 Getting Started

### 1. Launching the App
Nomi Manager requires no installation. It runs entirely in your web browser.
* **Web:** Simply visit the [GitHub Pages link](https://nick3335.github.io/Nomi-Manager/).
* **Mobile:** Tap "Add to Home Screen" in your browser menu to install it as an app.

### 2. Importing Your Data
To instantly populate the manager with your existing Nomis:
1.  Open **Settings** (Gear Icon).
2.  Enter your **Nomi.ai API Key** (found in the Nomi App under *Profile > Integrations*).
3.  Click **Import from Nomi.ai**.

### 3. Setting Up Multi-Device Sync
Sync allows you to work on your desktop and pick up right where you left off on your phone. We use GitHub Gists as a free, secure, and private storage locker for your data.

#### Step A: Get a GitHub Token
1.  Log in to GitHub and go to **Settings** > **Developer Settings** > **Personal Access Tokens** > **Tokens (classic)**.
2.  Click **Generate new token (classic)**.
3.  Give it a Note name (e.g., "Nomi Sync").
4.  Check the box next to **`gist`** (Create gists). This is the only permission needed.
5.  Scroll down and click **Generate token**.
6.  **Copy the token immediately** (it starts with `ghp_`). You won't see it again.

#### Step B: Create a Secret Gist
1.  Go to [gist.github.com](https://gist.github.com).
2.  In the "Gist description" box, type: `Nomi Manager Data`.
3.  In the "Filename" box, type: `.json`.
4.  In the file content area, type two curly braces: `{}`.
5.  Click **Create secret gist**.

#### Step C: Find Your Gist ID
1.  Once your Gist is created, look at your browser's address bar.
2.  The URL will look like this: `https://gist.github.com/YourUsername/8f3e9c2b4d7a5e6f1a8b9c2d3e4f5a6b`.
3.  **Your Gist ID is the long string of random characters at the very end.**
    * *Example:* If the URL ends in `.../8f3e9c2b4d7a5e6f1a8b9c2d3e4f5a6b`, copy just `8f3e9c2b4d7a5e6f1a8b9c2d3e4f5a6b`.

#### Step D: Connect in Nomi Manager
1.  Open Nomi Manager **Settings**.
2.  Paste your **GitHub Token** (from Step A).
3.  Paste your **Gist ID** (from Step C).
4.  Click **Save**.
5.  Enable **Auto-Sync** to keep your devices updated automatically.

---

## 🔒 Privacy & Security

Nomi Manager is designed with a strict "Client-Side Only" architecture:
* **Local Storage:** Your backstories, prompts, and images are stored locally on your device.
* **Direct Connections:** Your API keys are never sent to a third-party server. They are only used to communicate directly with Nomi.ai (for imports) or GitHub (for sync).
* **No Tracking:** There are no analytics pixels, tracking scripts, or advertising SDKs.

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
